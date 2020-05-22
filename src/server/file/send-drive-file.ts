import * as Router from '@koa/router';
import * as send from 'koa-send';
import * as mongodb from 'mongodb';
import * as tmp from 'tmp';
import * as fs from 'fs';
import * as rename from 'rename';
import DriveFile, { getDriveFileBucket } from '../../models/drive-file';
import DriveFileThumbnail, { getDriveFileThumbnailBucket } from '../../models/drive-file-thumbnail';
import DriveFileWebpublic, { getDriveFileWebpublicBucket } from '../../models/drive-file-webpublic';
import { serverLogger } from '..';

import { convertToJpeg, convertToPngOrJpeg } from '../../services/drive/image-processor';
import { generateVideoThumbnail } from '../../services/drive/generate-video-thumbnail';
import { contentDisposition } from '../../misc/content-disposition';
import { detectType } from '../../misc/get-file-info';
import { downloadUrl } from '../../misc/download-url';
import { InternalStorage } from '../../services/drive/internal-storage';

const assets = `${__dirname}/../../server/file/assets/`;

const commonReadableHandlerGenerator = (ctx: Router.RouterContext) => (e: Error): void => {
	serverLogger.error(e);
	ctx.status = 500;
	ctx.set('Cache-Control', 'max-age=300');
};

export default async function(ctx: Router.RouterContext) {
	// Validate id
	if (!mongodb.ObjectID.isValid(ctx.params.id)) {
		ctx.throw(400, 'incorrect id');
		return;
	}

	const fileId = new mongodb.ObjectID(ctx.params.id);

	// Fetch drive file
	const file = await DriveFile.findOne({ _id: fileId });

	if (file == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'max-age=86400');
		await send(ctx, '/dummy.png', { root: assets });
		return;
	}

	// 未保存/期限切れリモートファイル
	if (file.metadata.withoutChunks && (file.metadata.isRemote || file.metadata._user && file.metadata._user.host != null)) {
		// urlは過去のバグで張り替え忘れている可能性があるためuriを優先する
		const url = file.metadata.uri || file.metadata.url;

		// Create temp file
		const [path, cleanup] = await new Promise<[string, any]>((res, rej) => {
			tmp.file((e, path, fd, cleanup) => {
				if (e) return rej(e);
				res([path, cleanup]);
			});
		});

		try {
			await downloadUrl(url, path);

			const { mime, ext } = await detectType(path);

			const convertFile = async () => {
				if ('thumbnail' in ctx.query) {
					if (['image/jpg', 'image/webp'].includes(mime)) {
						return await convertToJpeg(path, 530, 255);
					} else if (['image/png'].includes(mime)) {
						return await convertToPngOrJpeg(path, 530, 255);
					} else if (mime.startsWith('video/')) {
						return await generateVideoThumbnail(path);
					}
				}

				return {
					data: fs.readFileSync(path),
					ext,
					type: mime,
				};
			};

			const file = await convertFile();
			ctx.body = file.data;
			ctx.set('Content-Type', file.type);
			ctx.set('Cache-Control', 'max-age=31536000, immutable');
		} catch (e) {
			serverLogger.error(e);

			if (typeof e == 'number' && e >= 400 && e < 500) {
				ctx.status = e;
				ctx.set('Cache-Control', 'max-age=86400');
			} else {
				ctx.status = 500;
				ctx.set('Cache-Control', 'max-age=300');
			}
		} finally {
			cleanup();
		}
		return;
	}

	// 削除済み
	if (file.metadata.deletedAt) {
		ctx.status = 410;
		ctx.set('Cache-Control', 'max-age=86400');
		await send(ctx, '/tombstone.png', { root: assets });
		return;
	}

	// ローカル保存じゃないのにここに来た
	if (file.metadata.withoutChunks) {
		ctx.status = 204;
		ctx.set('Cache-Control', 'max-age=86400');
		return;
	}

	// ファイルシステム格納
	if (file.metadata?.fileSystem) {
		const isThumbnail = 'thumbnail' in ctx.query;
		const isWebpublic = 'web' in ctx.query;

		if (isThumbnail || isWebpublic) {
			const key = isThumbnail ? file.metadata.storageProps?.thumbnailKey : file.metadata.storageProps?.webpublicKey;
			if (!key) throw 'fs but key not found';

			const { mime, ext } = await detectType(InternalStorage.resolvePath(key));
			const filename = rename(file.filename, {
				suffix: isThumbnail ? '-thumb' : '-web',
				extname: ext ? `.${ext}` : undefined
			}).toString();

			ctx.body = InternalStorage.read(key);
			ctx.set('Content-Type', mime);
			ctx.set('Cache-Control', 'max-age=31536000, immutable');
			ctx.set('Content-Disposition', contentDisposition('inline', filename));
			return;
		} else {	// オリジナル
			// オリジナルはキーチェック
			if (file.metadata && file.metadata.accessKey && file.metadata.accessKey != ctx.query['original']) {
				ctx.status = 403;
				ctx.set('Cache-Control', 'max-age=86400');
				return;
			}

			const key = file.metadata.storageProps?.key;
			if (!key) throw 'fs but key not found';

			const readable = InternalStorage.read(key);
			readable.on('error', commonReadableHandlerGenerator(ctx));
			ctx.body = readable;
			ctx.set('Content-Type', file.contentType);
			ctx.set('Cache-Control', 'max-age=31536000, immutable');
			ctx.set('Content-Disposition', contentDisposition('inline', file.filename));
			return;
		}
	}

	const sendRaw = async () => {
		if (file.metadata && file.metadata.accessKey && file.metadata.accessKey != ctx.query['original']) {
			ctx.status = 403;
			ctx.set('Cache-Control', 'max-age=86400');
			return;
		}

		const bucket = await getDriveFileBucket();
		const readable = bucket.openDownloadStream(fileId);
		readable.on('error', commonReadableHandlerGenerator(ctx));
		ctx.body = readable;
		ctx.set('Content-Type', file.contentType);
		ctx.set('Cache-Control', 'max-age=31536000, immutable');
	};

	if ('thumbnail' in ctx.query) {
		const thumb = await DriveFileThumbnail.findOne({
			'metadata.originalId': fileId
		});

		if (thumb != null) {
			ctx.set('Content-Type', thumb.contentType || 'image/jpeg');
			ctx.set('Content-Disposition', contentDisposition('inline', `${rename(file.filename, { suffix: '-thumb', extname: '.jpeg' })}`));
			const bucket = await getDriveFileThumbnailBucket();
			ctx.body = bucket.openDownloadStream(thumb._id);
			ctx.set('Cache-Control', 'max-age=31536000, immutable');
		} else {
			if (file.contentType.startsWith('image/')) {
				ctx.set('Content-Disposition', contentDisposition('inline', `${file.filename}`));
				await sendRaw();
			} else {
				ctx.status = 404;
				ctx.set('Cache-Control', 'max-age=86400');
				await send(ctx, '/thumbnail-not-available.png', { root: assets });
			}
		}
	} else if ('web' in ctx.query) {
		const web = await DriveFileWebpublic.findOne({
			'metadata.originalId': fileId
		});

		if (web != null) {
			ctx.set('Content-Type', web.contentType || file.contentType);
			ctx.set('Content-Disposition', contentDisposition('inline', `${rename(file.filename, { suffix: '-web' })}`));

			const bucket = await getDriveFileWebpublicBucket();
			ctx.body = bucket.openDownloadStream(web._id);
			ctx.set('Cache-Control', 'max-age=31536000, immutable');
		} else {
			ctx.set('Content-Disposition', contentDisposition('inline', `${file.filename}`));
			await sendRaw();
		}
	} else {
		ctx.set('Content-Disposition', contentDisposition('inline', `${file.filename}`));

		await sendRaw();
	}
}
