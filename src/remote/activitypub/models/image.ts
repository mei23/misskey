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
	const { document, apId } = await getApDocument(actor, value);

	if (!document) return null;	// not Document

	logger.info(`Creating the Image: ${document.url} apId=${apId}`);

	const instance = await fetchMeta();
	const cache = instance.cacheRemoteFiles;

	let file;
	try {
		file = await uploadFromUrl({ url: document.url as string, user: actor, uri: document.url as string, sensitive: !!document.sensitive, isLink: !cache, apId });
	} catch (e) {
		// 4xxの場合は添付されてなかったことにする
		if (e instanceof StatusError && e.isPermanentError) {
			logger.warn(`Ignored image: ${document.url} - ${e.statusCode}`);
			return null;
		}

		throw e;
	}

	const fresh = await detectChangeAndUpdate(file, document);
	return fresh;
}

/**
 * Imageを解決します。
 *
 * Misskeyに対象のImageが登録されていればそれを返し、そうでなければ
 * リモートサーバーからフェッチしてMisskeyに登録しそれを返します。
 */
export async function resolveImage(actor: IRemoteUser, value: IObject): Promise<IDriveFile | null | undefined> {
	const { document, apId } = await getApDocument(actor, value);

	if (!document) return null;	// not Document

	if (apId) {
		const exists = await DriveFile.findOne({ apId: document.id });

		if (exists) {
			const fresh = await detectChangeAndUpdate(exists, document);
			return fresh;
		}
	}

	// リモートサーバーからフェッチしてきて登録
	return await createImage(actor, value);
}

export async function updateImage(actor: IRemoteUser, value: IObject): Promise<string> {
	const { document, apId } = await getApDocument(actor, value);

	if (!document) return `skip: invalid Document`;
	if (!apId) return `skip: invalid apId=${apId}`;

	const exists = await DriveFile.findOne({ apId });
	if (!exists) return `skip: not existant apId=${apId}`;

	// check owner
	if (!oidEquals(exists.metadata?.userId, actor._id)) return `skip: invalid owner`;

	await detectChangeAndUpdate(exists, document);

	return `ok: updated apId=${apId}`;
}

/**
 * Detect DriveFile changes and update
 * @param exists Current DB entity
 * @param document Incomming AP Document
 * @returns Fresh DriveFile
 */
async function detectChangeAndUpdate(exists: IDriveFile, document: IApDocument) {
	const set = { } as any;

	// detect general metadata changes
	if (typeof document.sensitive === 'boolean') set.isSensitive = document.sensitive;
	if (typeof document.name === 'string') set.name = document.name;

	// detect src url change
	if (exists.metadata?.isRemote && exists.metadata?.url !== document.url) {
		set['metadata.url'] = document.url;
		set['metadata.uri'] = document.url;
	}

	// TODO: no peform no needd

	const fresh = await DriveFile.findOneAndUpdate({ _id: exists._id }, {
		$set: set
	}, {
		returnNewDocument: true
	});

	if (!fresh) throw 'unex 23414r2t';
	return fresh;
}

/**
 * Get validated Document and apId (if available)
 */
async function getApDocument(actor: IRemoteUser, value: IObject): Promise<{ document?: IApDocument, apId?: string }> {
	// check actor available
	if (actor.isSuspended || actor.isDeleted) return { };

	const document = await new Resolver().resolve(value);

	// check valid Document
	if (!isDocument(document)) return { };
	if (typeof document.url !== 'string') return { };

	// provide apId if valid
	let apId: string | undefined = undefined;
	try {
		if (typeof document.id === 'string' && toApHost(document.id) === toApHost(actor.uri)) apId = document.id;
	} catch { }

	return { document, apId };
}
