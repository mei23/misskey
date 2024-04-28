import { uploadFromUrl } from '../../../services/drive/upload-from-url';
import { IRemoteUser } from '../../../models/user';
import DriveFile, { IDriveFile } from '../../../models/drive-file';
import Resolver from '../resolver';
import fetchMeta from '../../../misc/fetch-meta';
import { apLogger } from '../logger';
import { IApDocument, IObject, getApId, isDocument } from '../type';
import { StatusError } from '../../../misc/fetch';
import { oidEquals } from '../../../prelude/oid';

const logger = apLogger;

/**
 * Imageを作成します。
 */
export async function createImage(actor: IRemoteUser, value: IObject): Promise<IDriveFile | null | undefined> {
	// 投稿者が凍結か削除されていたらスキップ
	if (actor.isSuspended || actor.isDeleted) {
		return null;
	}

	const image = await new Resolver().resolve(value);

	if (!isDocument(image)) return null;

	if (typeof image.url !== 'string') {
		return null;
	}

	logger.info(`Creating the Image: ${image.url}`);

	const instance = await fetchMeta();
	const cache = instance.cacheRemoteFiles;

	let file;
	try {
		file = await uploadFromUrl({ url: image.url, user: actor, uri: image.url, sensitive: !!image.sensitive, isLink: !cache, apId: image.id });
	} catch (e) {
		// 4xxの場合は添付されてなかったことにする
		if (e instanceof StatusError && e.isPermanentError) {
			logger.warn(`Ignored image: ${image.url} - ${e.statusCode}`);
			return null;
		}

		throw e;
	}

	if (file.metadata?.isRemote) {
		// URLが異なっている場合、同じ画像が以前に異なるURLで登録されていたということなので、
		// URLを更新する
		if (file.metadata.url !== image.url) {
			file = await DriveFile.findOneAndUpdate({ _id: file._id }, {
				$set: {
					'metadata.url': image.url,
					'metadata.uri': image.url
				}
			}, {
				returnNewDocument: true
			});
		}
	}

	return file;
}

/**
 * Imageを解決します。
 *
 * Misskeyに対象のImageが登録されていればそれを返し、そうでなければ
 * リモートサーバーからフェッチしてMisskeyに登録しそれを返します。
 */
export async function resolveImage(actor: IRemoteUser, value: IObject): Promise<IDriveFile | null | undefined> {
	const apId = getApId(value);
	
	if (apId) {
		const exists = await DriveFile.findOne({ apId });

		if (exists) {
			const set = { } as any;

			// update metadata
			if (typeof value.sensitive === 'boolean') set.isSensitive = value.sensitive;
			if (typeof value.name === 'string') set.name = value.name;

			// detect url change
			if (exists.metadata?.isRemote && exists.metadata?.url !== value.url) {
				set['metadata.url'] = value.url;
				set['metadata.uri'] = value.url;
			}

			const fresh = await DriveFile.findOneAndUpdate({ _id: exists._id }, {
				$set: set
			}, {
				returnNewDocument: true
			});

			return fresh;
		}
	}

	// リモートサーバーからフェッチしてきて登録
	return await createImage(actor, value);
}

export async function updateImage(actor: IRemoteUser, value: IApDocument) {
	const apId = getApId(value);
	if (!apId) return `skip !apId`;

	const exists = await DriveFile.findOne({ apId });
	if (!exists) return `skip !exists`;

	// check owner
	if (!oidEquals(exists.metadata?.userId, actor._id)) return `skip !owner`;

	const set = { } as any;

	if (typeof value.sensitive === 'boolean') set.isSensitive = value.sensitive;
	if (typeof value.name === 'string') set.name = value.name;

	if (exists.metadata?.isRemote && exists.metadata?.url !== value.url) {
		set['metadata.url'] = value.url;
		set['metadata.uri'] = value.url;
	}

	await DriveFile.findOneAndUpdate({ _id: exists._id }, {
		$set: set
	});

	return `ok`;
}
