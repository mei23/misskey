import * as promiseLimit from 'promise-limit';

import config from '../../../config';
import Resolver from '../resolver';
import { INote } from '../../../models/note';
import post from '../../../services/note/create';
import { IPost, IObject, getOneApId, getApId, getOneApHrefNullable, isPost, isEmoji, IApImage } from '../type';
import { resolvePerson, updatePerson } from './person';
import { resolveImage } from './image';
import { IRemoteUser } from '../../../models/user';
import { htmlToMfm } from '../misc/html-to-mfm';
import Emoji, { IEmoji } from '../../../models/emoji';
import { extractApMentions } from './mention';
import { extractApHashtags } from './tag';
import { toUnicode } from 'punycode';
import { unique, toArray, toSingle } from '../../../prelude/array';
import { extractPollFromQuestion } from './question';
import vote from '../../../services/note/polls/vote';
import { apLogger } from '../logger';
import { IDriveFile } from '../../../models/drive-file';
import { deliverQuestionUpdate } from '../../../services/note/polls/update';
import { extractApHost } from '../../../misc/convert-host';
import { getApLock } from '../../../misc/app-lock';
import { createMessage } from '../../../services/messages/create';
import { isBlockedHost } from '../../../misc/instance-info';
import { parseAudience } from '../audience';
import MessagingMessage from '../../../models/messaging-message';
import DbResolver from '../db-resolver';
import { tryStockEmoji } from '../../../services/emoji-store';

const logger = apLogger;

function toNote(object: IObject, uri: string): IPost {
	const expectHost = extractApHost(uri);

	if (object == null) {
		throw new Error('invalid Note: object is null');
	}

	if (!isPost(object)) {
		throw new Error(`invalid Note: invalid object type ${object.type}`);
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
 */
export async function createNote(value: string | IObject, resolver?: Resolver | null, silent = false): Promise<INote | null> {
	if (resolver == null) resolver = new Resolver();

	const object = await resolver.resolve(value);

	const entryUri = getApId(value);

	let note: IPost;
	try {
		note = toNote(object, entryUri);
	} catch (err) {
		logger.error(`${err.message}`, {
			resolver: {
				history: resolver.getHistory()
			},
			value: value,
			object: object
		});
		return null;
	}

	logger.debug(`Note fetched: ${JSON.stringify(note, null, 2)}`);

	logger.info(`Creating the Note: ${note.id}`);

	// 投稿者をフェッチ
	const actor = await resolvePerson(getOneApId(note.attributedTo), null, resolver) as IRemoteUser;

	// 投稿者が凍結されていたらスキップ
	if (actor.isSuspended) {
		return null;
	}

	const noteAudience = await parseAudience(actor, note.to, note.cc);
	let visibility = noteAudience.visibility;
	const visibleUsers = noteAudience.visibleUsers;

	// Audience (to, cc) が指定されてなかった場合
	if (visibility === 'specified' && visibleUsers.length === 0) {
		if (typeof value === 'string') {	// 入力がstringならばresolverでGETが発生している
			// こちらから匿名GET出来たものならばpublic
			visibility = 'public';
		}
	}

	const apMentions = await extractApMentions(note.tag);
	const apHashtags = await extractApHashtags(note.tag);

	let isTalk = note._misskey_talk && visibility === 'specified';

	// 添付ファイル
	// Noteがsensitiveなら添付もsensitiveにする
	const limit = promiseLimit(2);

	note.attachment = toArray(note.attachment);
	const files = note.attachment
		.map(attach => attach.sensitive = note.sensitive)
		? (await Promise.all(note.attachment.map(x => limit(() => resolveImage(actor, x)) as Promise<IDriveFile>)))
			.filter(image => image != null)
		: [];

	// リプライ
	const reply: INote = note.inReplyTo
		? await resolveNote(getOneApId(note.inReplyTo), resolver).then(x => {
			if (x == null) {
				logger.warn(`Specified inReplyTo, but not found`);
				throw new Error('inReplyTo not found');
			} else {
				return x;
			}
		}).catch(async e => {
			// トークだったらinReplyToのエラーは無視
			const uri = getApId(getOneApId(note.inReplyTo));
			if (uri.startsWith(config.url + '/')) {
				const id = uri.split('/').pop();
				const talk = await MessagingMessage.findOne({ _id: id });
				if (talk) {
					isTalk = true;
					return null;
				}
			}

			logger.warn(`Error in inReplyTo ${note.inReplyTo} - ${e.statusCode || e}`);
			//throw e;
			return null;
		})
		: null;

	// 引用
	let quote: INote;

	if (note._misskey_quote || note.quoteUrl) {
		const tryResolveNote = async (uri: string): Promise<{
			status: 'ok' | 'permerror' | 'temperror';
			res?: INote | null;
		}> => {
			if (typeof uri !== 'string' || !uri.match(/^https?:/)) return { status: 'permerror' };
			try {
				const res = await resolveNote(uri);
				if (res) {
					return {
						status: 'ok',
						res
					};
				} else {
					return {
						status: 'permerror'
					};
				}
			} catch (e) {
				return {
					status: e.statusCode >= 400 && e.statusCode < 500 ? 'permerror' : 'temperror'
				};
			}
		};

		const uris = unique([note._misskey_quote, note.quoteUrl].filter(x => typeof x === 'string') as string[]);
		const results = await Promise.all(uris.map(uri => tryResolveNote(uri)));

		quote = results.filter(x => x.status === 'ok').map(x => x.res).find(x => x);
		if (!quote) {
			if (results.some(x => x.status === 'temperror')) {
				throw 'quote resolve failed';
			}
		}
	}

	const cw = note.summary === '' ? null : note.summary;

	// テキストのパース
	const text = htmlToMfm(note.content, note.tag);

	// vote
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

		// 後方互換性のため
		if (text) {
			const m = text.match(/(\d+)$/);

			if (m) {
				return await tryCreateVote(m[0], Number(m[1]));
			}
		}
	}

	const emojis = await extractEmojis(note.tag, actor.host).catch(e => {
		logger.info(`extractEmojis: ${e}`);
		return [] as IEmoji[];
	});

	const apEmojis = emojis.map(emoji => emoji.name);

	const poll = await extractPollFromQuestion(note, resolver).catch(() => undefined);

	// ユーザーの情報が古かったらついでに更新しておく
	if (actor.lastFetchedAt == null || Date.now() - actor.lastFetchedAt.getTime() > 1000 * 60 * 60 * 24) {
		updatePerson(actor.uri);
	}

	if (isTalk) {
		for (const recipient of visibleUsers) {
			return await createMessage(actor, recipient, text, (files && files.length > 0) ? files[0] : undefined, object.id);
		}
	}

	return await post(actor, {
		createdAt: note.published ? new Date(note.published) : undefined,
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
	if (await isBlockedHost(extractApHost(uri))) throw { statusCode: 451 };

	const unlock = await getApLock(uri);

	try {
		//#region このサーバーに既に登録されていたらそれを返す
		const exist = await fetchNote(uri);

		if (exist) {
			return exist;
		}
		//#endregion

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
				if ((tag.updated != null && exists.updatedAt == null)
					|| (tag.id != null && exists.uri == null)
					|| (tag.updated != null && exists.updatedAt != null && new Date(tag.updated) > exists.updatedAt)) {
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

				await tryStockEmoji(exists).catch(() => {});

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

			await tryStockEmoji(emoji).catch(() => {});

			return emoji;
		})
	);
}
