import { uploadFromUrl } from '../../../services/drive/upload-from-url';
import { IRemoteUser } from '../../../models/user';
import DriveFile, { IDriveFile } from '../../../models/drive-file';
import Resolver from '../resolver';
import fetchMeta from '../../../misc/fetch-meta';
import { apLogger } from '../logger';
import { IApDocument, IObject, isDocument } from '../type';
import { StatusError } from '../../../misc/fetch';
import { oidEquals } from '../../../prelude/oid';
import { toApHost } from '../../../misc/convert-host';

const logger = apLogger;

/**
 * Imageを作成します。
 */
export async function createImage(actor: IRemoteUser, value: IObject): Promise<IDriveFile | null | undefined> {
	const { object, apId } = await getApDocument(actor, value);

	if (!object) return null;	// not Document

	logger.info(`Creating the Image: ${object.url}`);

	const instance = await fetchMeta();
	const cache = instance.cacheRemoteFiles;

	let file;
	try {
		file = await uploadFromUrl({ url: object.url as string, user: actor, uri: object.url as string, sensitive: !!object.sensitive, isLink: !cache, apId });
	} catch (e) {
		// 4xxの場合は添付されてなかったことにする
		if (e instanceof StatusError && e.isPermanentError) {
			logger.warn(`Ignored image: ${object.url} - ${e.statusCode}`);
			return null;
		}

		throw e;
	}

	// URLが異なっている場合、同じ画像が以前に異なるURLで登録されていたということなので、
	// URLを更新する
	if (file.metadata?.isRemote && file.metadata.url !== object.url) {
		file = await DriveFile.findOneAndUpdate({ _id: file._id }, {
			$set: {
				'metadata.url': object.url,
				'metadata.uri': object.url
			}
		}, {
			returnNewDocument: true
		});
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
	const { object, apId } = await getApDocument(actor, value);

	if (!object) return null;	// not Document

	if (apId) {
		const exists = await DriveFile.findOne({ apId: value.id });

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

export async function updateImage(actor: IRemoteUser, value: IObject): Promise<string> {
	const { object, apId } = await getApDocument(actor, value);

	if (!object) return `skip !object`;
	if (!apId) return `skip !apId`;

	const exists = await DriveFile.findOne({ apId });
	if (!exists) return `skip !exists`;

	// check owner
	if (!oidEquals(exists.metadata?.userId, actor._id)) return `skip !owner`;

	const set = { } as any;

	if (typeof object.sensitive === 'boolean') set.isSensitive = object.sensitive;
	if (typeof object.name === 'string') set.name = object.name;

	if (exists.metadata?.isRemote && exists.metadata?.url !== object.url) {
		set['metadata.url'] = object.url;
		set['metadata.uri'] = object.url;
	}

	await DriveFile.findOneAndUpdate({ _id: exists._id }, {
		$set: set
	});

	return `ok`;
}

async function getApDocument(actor: IRemoteUser, value: IObject): Promise<{ object?: IApDocument, apId?: string }> {
	// 投稿者が凍結か削除されていたらスキップ
	if (actor.isSuspended || actor.isDeleted) return { };

	const object = await new Resolver().resolve(value);

	// check valid Document
	if (!isDocument(object)) return { };
	if (typeof object.url !== 'string') return { };

	// check valid id
	let apId: string | undefined = undefined;
	try {
		if (typeof object.id === 'string' && toApHost(object.id) === toApHost(actor.uri)) apId = object.id;
	} catch { }

	return { object, apId };
}
