import * as Router from '@koa/router';
import * as mongodb from 'mongodb';
import * as tmp from 'tmp';
import * as fs from 'fs';
import * as stream from 'stream';
import * as rename from 'rename';
import DriveFile, { getDriveFileBucket, IDriveFile } from '../../models/drive-file';
import DriveFileThumbnail, { getDriveFileThumbnailBucket } from '../../models/drive-file-thumbnail';
import DriveFileWebpublic, { getDriveFileWebpublicBucket } from '../../models/drive-file-webpublic';
import { serverLogger } from '..';

import { convertToJpeg, convertToPngOrJpeg } from '../../services/drive/image-processor';
import { generateVideoThumbnail } from '../../services/drive/generate-video-thumbnail';
import { contentDisposition } from '../../misc/content-disposition';
import { detectType } from '../../misc/get-file-info';
import { downloadUrl } from '../../misc/download-url';
import { InternalStorage } from '../../services/drive/internal-storage';

const commonReadableHandlerGenerator = (ctx: Router.RouterContext) => (e: Error): void => {
	serverLogger.error(e);
	ctx.status = 500;
	ctx.set('Cache-Control', 'max-age=300');
};

export default async function(ctx: Router.RouterContext) {
	//#region Validate id
	if (!mongodb.ObjectID.isValid(ctx.params.id)) {
		return await sendError(ctx, 404);
	}
	//#endregion

	//#region Fetch driveFile
	const fileId = new mongodb.ObjectID(ctx.params.id);
	const file = await DriveFile.findOne({ _id: fileId });
	if (file == null) {
		return await sendError(ctx, 404);
	}
	//#endregion

	//#region 未保存/期限切れリモートファイル
	if (file.metadata?.withoutChunks && (file.metadata.isRemote || file.metadata._user.host != null)) {
		// urlは過去のバグで張り替え忘れている可能性があるためuriを優先する
		const url = file.metadata.uri || file.metadata.url;

		if (url == null) {
			return await sendError(ctx, 404);
		}

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
			return await sendNormal(ctx, file.data, file.type);
		} catch (e) {
			serverLogger.error(e);
			return await sendError(ctx, typeof e === 'number' && e >= 400 && e < 500 ? e : 500);
		} finally {
			cleanup();
		}
	}
	//#endregion 未保存/期限切れリモートファイル

	// 削除済み
	if (file.metadata?.deletedAt) {
		return await sendError(ctx, 410);
	}

	// ローカル保存じゃないのにここに来た
	if (file.metadata?.withoutChunks) {
		return await sendError(ctx, 404);
	}

	//#region ファイルシステム格納
	if (file.metadata?.fileSystem) {
		const isThumbnail = 'thumbnail' in ctx.query;
		const isWebpublic = 'web' in ctx.query;

		if (isThumbnail || isWebpublic) {	// オリジナル以外
			const key = isThumbnail ? (file.metadata.storageProps?.thumbnailKey || file.metadata.storageProps?.key) : (file.metadata.storageProps?.webpublicKey || file.metadata.storageProps?.key);
			if (!key) throw 'fs but key not found';

			const { mime, ext } = await detectType(InternalStorage.resolvePath(key));
			const filename = rename(file.filename, {
				suffix: isThumbnail ? '-thumb' : '-web',
				extname: ext ? `.${ext}` : undefined
			}).toString();

			return await sendNormal(ctx, InternalStorage.read(key), mime, filename);
		} else {	// オリジナル
			// オリジナルはキーチェック
			if (file.metadata && file.metadata.accessKey && file.metadata.accessKey != ctx.query['original']) {
				return await sendError(ctx, 403);
			}

			const key = file.metadata.storageProps?.key;
			if (!key) throw 'fs but key not found';

			const readable = InternalStorage.read(key);
			readable.on('error', commonReadableHandlerGenerator(ctx));
			return await sendNormal(ctx, readable, file.contentType, file.filename);
		}
	}
	//#endregion ファイルシステム格納

	//#region DB格納
	if ('thumbnail' in ctx.query) {
		const thumb = await DriveFileThumbnail.findOne({
			'metadata.originalId': file._id
		});

		if (thumb != null) {
			const bucket = await getDriveFileThumbnailBucket();
			return await sendNormal(ctx, bucket.openDownloadStream(thumb._id), thumb.contentType || 'image/jpeg', `${rename(file.filename, { suffix: '-thumb', extname: '.jpg' })}`);
		} else {
			if (file.contentType.startsWith('image/')) {
				return await sendRaw(ctx, file);
			} else {
				return await sendError(ctx, 404);
			}
		}
	} else if ('web' in ctx.query) {
		const web = await DriveFileWebpublic.findOne({
			'metadata.originalId': file._id
		});

		if (web != null) {
			const bucket = await getDriveFileWebpublicBucket();
			return await sendNormal(ctx, bucket.openDownloadStream(web._id), web.contentType || file.contentType, `${rename(file.filename, { suffix: '-web' })}`);
		} else {
			return await sendRaw(ctx, file);
		}
	} else {
		return await sendRaw(ctx, file);
	}
}

async function sendRaw(ctx: Router.RouterContext, file: IDriveFile): Promise<void> {
	if (file.metadata && file.metadata.accessKey && file.metadata.accessKey != ctx.query['original']) {
		return await sendError(ctx, 403);
	}

	const bucket = await getDriveFileBucket();
	const readable = bucket.openDownloadStream(file._id);
	readable.on('error', commonReadableHandlerGenerator(ctx));
	return await sendNormal(ctx, readable, file.contentType, file.filename);
}

async function sendNormal(ctx: Router.RouterContext, body: Buffer | stream.Stream, contentType: string, filename?: string): Promise<void> {
	ctx.body = body;
	ctx.set('Content-Type', contentType);
	ctx.set('Cache-Control', 'public, max-age=31536000, immutable');
	if (filename) ctx.set('Content-Disposition', contentDisposition('inline', filename));
}

async function sendError(ctx: Router.RouterContext, status: number): Promise<void> {
	ctx.status = status;
	ctx.set('Cache-Control', 'public, max-age=3600');
}
