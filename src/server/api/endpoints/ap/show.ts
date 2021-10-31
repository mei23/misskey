import $ from 'cafy';
import define from '../../define';
import config from '../../../../config';
import User, { pack as packUser, IUser } from '../../../../models/user';
import { createPerson, resolvePerson } from '../../../../remote/activitypub/models/person';
import Note, { pack as packNote, INote } from '../../../../models/note';
import { createNote, extractEmojis, resolveNote } from '../../../../remote/activitypub/models/note';
import Resolver from '../../../../remote/activitypub/resolver';
import { ApiError } from '../../error';
import { extractApHost } from '../../../../misc/convert-host';
import { isActor, isPost, getApId, isEmoji, isLike, getApType } from '../../../../remote/activitypub/type';
import { isBlockedHost } from '../../../../services/instance-moderation';
import * as ms from 'ms';
import * as escapeRegexp from 'escape-regexp';
import { StatusError } from '../../../../misc/fetch';
import Emoji, { IEmoji } from '../../../../models/emoji';
import NoteReaction, { INoteReaction, pack as packReaction } from '../../../../models/note-reaction';
import createReaction from '../../../../services/note/reaction/create';

export const meta = {
	tags: ['federation'],

	desc: {
		'ja-JP': 'URIを指定してActivityPubオブジェクトを参照します。'
	},

	requireCredential: true as const,

	limit: {
		duration: ms('1hour'),
		max: 3600
	},

	params: {
		uri: {
			validator: $.str,
			desc: {
				'ja-JP': 'ActivityPubオブジェクトのURI'
			}
		},
	},

	errors: {
		noSuchObject: {
			message: 'No such object.',
			code: 'NO_SUCH_OBJECT',
			id: 'dc94d745-1262-4e63-a17d-fecaa57efc82'
		}
	}
};

export default define(meta, async (ps) => {
	try {
		const object = await fetchAny(ps.uri);
		if (object) {
			return object;
		} else {
			throw new ApiError(meta.errors.noSuchObject);
		}
	} catch (e) {
		if (e instanceof RejectedError) {
			throw new ApiError(meta.errors.noSuchObject);
		}

		if (e instanceof StatusError) {
			throw new ApiError(meta.errors.noSuchObject);
		}

		throw e;
	}
});

/***
 * URIからUserかNoteを解決する
 */
async function fetchAny(uri: string) {
	// URIがこのサーバーを指しているなら、ローカルユーザーIDとしてDBからフェッチ
	if (uri.startsWith(config.url + '/')) {
		const result = await processLocal(uri);
		if (result != null) return result;
	}

	// URI(AP Object id)としてDB検索
	const packed = await processRemote(uri);
	if (packed != null) return packed;

	// disableFederationならリモート解決しない
	if (config.disableFederation) throw new RejectedError('Federation disabled');

	// ブロックしてたら中断
	if (await isBlockedHost(extractApHost(uri))) throw new RejectedError('Instance blocked');

	// リモートから一旦オブジェクトフェッチ
	const resolver = new Resolver();
	const object = await resolver.resolve(uri);

	// /@user のような正規id以外で取得できるURIが指定されていた場合、ここで初めて正規URIが確定する
	// これはDBに存在する可能性があるため再度DB検索
	if (typeof object.id === 'string' && object.id !== uri) {
		// URIがこのサーバーを指しているなら、ローカルユーザーIDとしてDBからフェッチ
		if (object.id.startsWith(config.url + '/')) {
			return await processLocal(object.id);
			// ここで見つからなければローカルはなし確定なので流れ落ちなし
		}

		// ブロックしてたら中断
		if (await isBlockedHost(extractApHost(object.id))) throw new RejectedError('Instance blocked');

		// URI(AP Object id)としてDB検索
		const packed = await processRemote(object.id);
		if (packed !== null) return packed;
	}

	// それでもみつからなければ新規であるため登録
	if (isActor(object)) {
		const user = await createPerson(getApId(object));
		return await mergePack({ user });
	}

	if (isPost(object)) {
		const note = await createNote(getApId(object), null, true);
		return await mergePack({ note });
	}

	if (isEmoji(object)) {
		const emojis = await extractEmojis(object, extractApHost(uri));
		return await mergePack({ emoji: emojis[0] });
	}

	if (isLike(object)) {
		const like = object;
		const actor = await resolvePerson(getApId(like.actor));
		const note = await resolveNote(getApId(like.object), null, true);
		if (!actor.host) throw new Error('actor.host is null');
		if (!note) throw new Error('note not found');

		const reaction = await createReaction(actor, note, like._misskey_reaction || like.content || like.name, getApType(like) === 'Dislike');
		return await mergePack({ reaction });
	}

	return null;
}

/**
 * Process local URI
 * @param uri Local URI
 * @returns Packed API response, or null on not found.
 * @throws RejectedError on deleted, moderated or hidden.
 */
async function processLocal(uri: string) {
	// https://local/(users|notes)/:id
	const localIdRegex = new RegExp('^' + escapeRegexp(config.url) + '/' + '(\\w+)' + '/' + '(\\w+)/?$');
	const matchLocalId = uri.match(localIdRegex);
	if (matchLocalId) {
		const type = matchLocalId[1];
		const id = matchLocalId[2];

		return await mergePack({
			user: type === 'users' ? await User.findOne({ _id: id }) : null,
			note: type === 'notes' ? await Note.findOne({ _id: id }) : null,
			emoji: type === 'emojis' ? await Emoji.findOne({ name: id, host: null }) : null,
			reaction: type === 'likes' ? await NoteReaction.findOne({ _id: id }) : null,
		});
	}

	// https://local/@:username
	const localNameRegex = new RegExp('^' + escapeRegexp(config.url) + '/@(\\w+)/?$');
	const matchLocalName = uri.match(localNameRegex);
	if (matchLocalName) {
		const username = matchLocalName[1];
		return await mergePack({
			user: await User.findOne({ usernameLower: username.toLowerCase() })
		});
	}

	return null;
}

/**
 * Process remote URI
 * @param uri Local URI
 * @returns Packed API response, or null on not found.
 * @throws RejectedError on deleted, moderated or hidden.
 */
async function processRemote(uri: string) {
	const [user, note, emoji] = await Promise.all([
		User.findOne({ uri: uri }),
		Note.findOne({ uri: uri }),
		Emoji.findOne({ uri: uri }),
		// DBのリモートリアクションにはAP IDが付いてない
	]);

	return await mergePack({ user, note, emoji });
}

/**
 * Pack DB Object for API Response
 * @returns Packed API response, or null on not found.
 * @throws RejectedError on deleted, moderated or hidden.
 */
async function mergePack(opts: { user?: IUser | null, note?: INote | null, emoji?: IEmoji | null, reaction?: INoteReaction | null }) {
	if (opts.user != null) {
		if (opts.user.isDeleted) throw new RejectedError('User is deleted');
		if (opts.user.isSuspended) throw new RejectedError('User is suspended');
		return {
			type: 'User',
			object: await packUser(opts.user, null, { detail: true })
		};
	}

	if (opts.note != null) {
		const packedNote = await packNote(opts.note, null, { detail: true });
		if (packedNote?.isHidden) throw new RejectedError('Note is hidden');
		return {
			type: 'Note',
			object: packedNote
		};
	}

	if (opts.emoji != null) {
		return {
			type: 'Emoji',
			object: {
				name: `${opts.emoji.name}${ opts.emoji.host ? `@${opts.emoji.host}` : '' }`,
				host: opts.emoji.host,
				url: opts.emoji.url,
			},
		};
	}

	if (opts.reaction != null) {
		return {
			type: 'Reaction',
			object: await packReaction(opts.reaction),
		};
	}

	return null;
}

class RejectedError extends Error {
	constructor(message: string) {
		super(message);
	}
}
