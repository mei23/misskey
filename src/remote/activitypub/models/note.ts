import Resolver from '../resolver';
import { INote } from '../../../models/note';
import post from '../../../services/note/create';
import { IPost, IObject, getOneApId, getApId, getOneApHrefNullable, isPost, isEmoji, IApImage, getApType, isCollection, isCollectionPage, ICollectionPage } from '../type';
import { resolvePerson, updatePerson } from './person';
import { resolveImage } from './image';
import { IRemoteUser } from '../../../models/user';
import { htmlToMfm } from '../misc/html-to-mfm';
import Emoji, { IEmoji } from '../../../models/emoji';
import { extractApMentions } from './mention';
import { extractApHashtags } from './tag';
import { toUnicode } from 'punycode/';
import { toArray, toSingle } from '../../../prelude/array';
import { extractPollFromQuestion } from './question';
import vote from '../../../services/note/polls/vote';
import { apLogger } from '../logger';
import { IDriveFile } from '../../../models/drive-file';
import { deliverQuestionUpdate } from '../../../services/note/polls/update';
import { extractApHost, isSelfOrigin } from '../../../misc/convert-host';
import { getApLock } from '../../../misc/app-lock';
import { isBlockedHost } from '../../../services/instance-moderation';
import { parseAudience } from '../audience';
import DbResolver from '../db-resolver';
import { parseDate, parseDateWithLimit } from '../misc/date';
import { StatusError } from '../../../misc/fetch';

const logger = apLogger;

function toNote(object: IObject, uri: string): IPost {
	const expectHost = extractApHost(uri);

	if (object == null) {
		throw new Error('invalid Note: object is null');
	}

	if (!isPost(object)) {
		throw new Error(`invalid Note: invalid object type ${getApType(object)}`);
	}

	if (object.id && extractApHost(object.id) !== expectHost) {
		throw new Error(`invalid Note: id has different host. expected: ${expectHost}, actual: ${extractApHost(object.id)}`);
	}

	if (object.attributedTo && extractApHost(getOneApId(object.attributedTo)) !== expectHost) {
		throw new Error(`invalid Note: attributedTo has different host. expected: ${expectHost}, actual: ${extractApHost(getOneApId(object.attributedTo))}`);
	}

	return object;
}

/**
 * Noteをフェッチします。
 *
 * Misskeyに対象のNoteが登録されていればそれを返します。
 */
export async function fetchNote(object: string | IObject): Promise<INote | null> {
	const dbResolver = new DbResolver();
	return await dbResolver.getNoteFromApId(object);
}

/**
 * Noteを作成します。
 * @returns INote (success), null (skip) or Error
 */
export async function createNote(value: string | IObject, resolver?: Resolver | null, silent = false): Promise<INote | null> {
	// 必要だったらresolve
	if (resolver == null) resolver = new Resolver();

	const object = await resolver.resolve(value);

	const entryUri = getApId(value);

	// validate
	let note: IPost;
	try {
		note = toNote(object, entryUri);
	} catch (err: any) {
		logger.error(err);
		return null;
	}

	logger.debug(`Note fetched: ${JSON.stringify(note, null, 2)}`);

	logger.info(`Creating the Note: ${note.id}`);

	// 投稿者をフェッチ
	if (!note.attributedTo) return null;
	const actor = await resolvePerson(getOneApId(note.attributedTo), null, resolver) as IRemoteUser;

	// 投稿者が凍結か削除されていたらスキップ
	if (actor.isSuspended || actor.isDeleted) {
		return null;
	}

	// 公開範囲
	const { visibility, visibleUsers } = await parseAudience(actor, note.to, note.cc, resolver);
	// Audience (to, cc) が指定されてなかった場合はスキップ
	if (visibility === 'specified' && visibleUsers.length === 0) {
		logger.info(`No audience: ${note.id}`);
		return null;
	}

	// メンション
	const apMentions = await extractApMentions(note.tag, resolver);

	// ハッシュタグ
	const apHashtags = await extractApHashtags(note.tag);

	// 添付ファイル
	const files = await fetchAttachments(note, actor);

	// リプライ
	const reply = note.inReplyTo ? await resolveNote(getOneApId(note.inReplyTo), resolver) : null;

	// 引用
	const q = note._misskey_quote || note.quoteUri || note.quoteUrl;
	const quote = q ? await resolveNote(q, resolver) : null;

	// 参照
	const references = await fetchReferences(note, resolver).catch(() => []);

	const cw = note.summary === '' ? null : note.summary;

	// テキストのパース
	const text = (typeof note._misskey_content === 'string') ? note._misskey_content
		: (typeof note.source?.mediaType === 'string' && note.source.mediaType.match(/^text\/x\.misskeymarkdown(;.*)?$/) && typeof note.source.content === 'string') ? note.source.content
		: note.content ? htmlToMfm(note.content, note.tag)
		: null;

	// 投票
	if (reply && reply.poll) {
		const tryCreateVote = async (name: string, index: number): Promise<null> => {
			if (reply.poll.expiresAt && Date.now() > new Date(reply.poll.expiresAt).getTime()) {
				logger.warn(`vote to expired poll from AP: actor=${actor.username}@${actor.host}, note=${note.id}, choice=${name}`);
			} else if (index >= 0) {
				logger.info(`vote from AP: actor=${actor.username}@${actor.host}, note=${note.id}, choice=${name}`);
				await vote(actor, reply, index);

				// リモートフォロワーにUpdate配信
				deliverQuestionUpdate(reply._id);
			}
			return null;
		};

		if (note.name) {
			return await tryCreateVote(note.name, reply.poll.choices.findIndex(x => x.text === note.name));
		}
	}

	// 絵文字
	const emojis = await extractEmojis(note.tag || [], actor.host).catch(e => {
		logger.info(`extractEmojis: ${e}`);
		return [] as IEmoji[];
	});

	const apEmojis = emojis.map(emoji => emoji.name);

	// アンケート
	const poll = await extractPollFromQuestion(note, resolver).catch(() => undefined);

	// ユーザーの情報が古かったらついでに更新しておく
	if (actor.lastFetchedAt == null || Date.now() - actor.lastFetchedAt.getTime() > 1000 * 60 * 60 * 6) {
		updatePerson(actor.uri);
	}

	return await post(actor, {
		createdAt: parseDateWithLimit(note.published) || new Date(),
		files,
		reply,
		renote: quote,
		name: note.name,
		cw,
		text,
		viaMobile: false,
		localOnly: false,
		geo: undefined,
		visibility,
		visibleUsers,
		apMentions,
		apHashtags,
		apEmojis,
		poll,
		uri: note.id,
		url: getOneApHrefNullable(note.url),
		references,
	}, silent);
}

/**
 * Noteを解決します。
 *
 * Misskeyに対象のNoteが登録されていればそれを返し、そうでなければ
 * リモートサーバーからフェッチしてMisskeyに登録しそれを返します。
 */
export async function resolveNote(value: string | IObject, resolver?: Resolver | null, timeline = false): Promise<INote | null> {
	const uri = getApId(value);

	// ブロックしてたら中断
	if (await isBlockedHost(extractApHost(uri))) throw new StatusError('Blocked instance', 451, 'Blocked instance');

	const unlock = await getApLock(uri);

	try {
		//#region このサーバーに既に登録されていたらそれを返す
		const exist = await fetchNote(uri);

		if (exist) {
			return exist;
		}
		//#endregion

		if (isSelfOrigin(uri)) {
			throw new StatusError('cannot resolve local note', 400, 'cannot resolve local note');
		}

		// リモートサーバーからフェッチしてきて登録
		// ここでuriの代わりに添付されてきたNote Objectが指定されていると、サーバーフェッチを経ずにノートが生成されるが
		// 添付されてきたNote Objectは偽装されている可能性があるため、常にuriを指定してサーバーフェッチを行う。
		return await createNote(uri, resolver, !!timeline);
	} finally {
		unlock();
	}
}

export async function extractEmojis(tags: IObject | IObject[], host_: string) {
	const host = toUnicode(host_.toLowerCase());

	const eomjiTags = toArray(tags).filter(isEmoji);

	return await Promise.all(
		eomjiTags.map(async tag => {
			const name = tag.name.replace(/^:/, '').replace(/:$/, '');
			tag.icon = toSingle(tag.icon) as IApImage;

			let exists = await Emoji.findOne({
				host,
				name
			});

			if (exists) {
				// 更新されていたら更新
				const updated = parseDate(tag.updated);
				if ((updated != null && exists.updatedAt == null)
					|| (tag.id != null && exists.uri == null)
					|| (updated != null && exists.updatedAt != null && updated > exists.updatedAt)) {
						logger.info(`update emoji host=${host}, name=${name}`);
						exists = await Emoji.findOneAndUpdate({
							host,
							name,
						}, {
							$set: {
								uri: tag.id,
								url: tag.icon.url,
								saved: false,
								updatedAt: new Date(),
							}
						}) as IEmoji;
				}

				return exists;
			}

			logger.info(`register emoji host=${host}, name=${name}`);

			const emoji = await Emoji.insert({
				host,
				name,
				uri: tag.id,
				url: tag.icon.url,
				updatedAt: tag.updated ? new Date(tag.updated) : undefined,
				aliases: []
			});

			return emoji;
		})
	);
}

async function fetchReferences(note: IPost, resolver: Resolver) {
	if (!note.references) return [];

	// get root
	const root = await resolver.resolve(note.references);

	// get firstPage
	let page: ICollectionPage | undefined;
	if (isCollection(root) && root.first) {
		const t = await resolver.resolve(root.first);
		if (isCollectionPage(t)) {
			page = t;
		} else {
			throw 'cant find firstPage';
		}
	}

	const references: INote[] = [];

	// Page再帰
	for (let i = 0; i < 100; i++) {
		if (!page?.items) throw 'page not have items';

		for (const item of page.items) {
			const post = await resolveNote(getApId(item)).catch(() => null);	// 他鯖のオブジェクトが本物かわからないのでstring => uri => resolve
			if (post) {
				references.push(post);
				if (references.length > 100) throw 'too many references';
			} else {
				// not post
			}
		}

		if (page.next) {
			const t = await resolver.resolve(page.next);
			if (isCollectionPage(t)) {
				page = t;
			} else {
				throw 'cant find next';
			}
		} else {
			return references;
		}
	}

	return [];
}

async function fetchAttachments(note: IPost, actor: IRemoteUser) {
	let attachment = toArray(note.attachment).slice(0, 16);

	let files: IDriveFile[] = [];

	for (const attach of attachment) {
		attach.sensitive ||= note.sensitive
		const file = await resolveImage(actor, attach);
		if (file) files.push(file);
	}

	return files;
}
