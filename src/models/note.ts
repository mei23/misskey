import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import { length } from 'stringz';
import { IUser, pack as packUser } from './user';
import PollVote from './poll-vote';
import NoteReaction from './note-reaction';
import { packMany as packFileMany, IDriveFile } from './drive-file';
import Following from './following';
import { packEmojis } from '../misc/pack-emojis';
import { dbLogger } from '../db/logger';
import { decodeReaction, decodeReactionCounts } from '../misc/reaction-lib';
import { parseFull } from '../mfm/parse';
import { PackedNote } from './packed-schemas';
import { awaitAll } from '../prelude/await-all';
import { pack as packApp } from './app';
import { toISODateOrNull, toOidString, toOidStringOrNull } from '../misc/pack-utils';
import { transform } from '../misc/cafy-id';
import { extractMfmTypes } from '../mfm/extract-mfm-types';
import { nyaize } from '../misc/nyaize';
import { extractEmojis } from '../mfm/extract-emojis';

const Note = db.get<INote>('notes');
Note.createIndex('uri', { sparse: true, unique: true });
Note.createIndex('mentions');
Note.createIndex('visibleUserIds');
Note.createIndex('replyId');
Note.createIndex('renoteId');
Note.createIndex('tagsLower');
Note.createIndex('_user.host');
Note.createIndex('_files._id');
Note.createIndex('_files.contentType');
Note.createIndex({ createdAt: -1 });
Note.createIndex({ score: -1 }, { sparse: true });
Note.createIndex({ '_user.host': 1, replyId: 1, _id: -1 });
Note.createIndex('mecabWords');
Note.createIndex('trendWords');
Note.createIndex({ 'userId': 1, _id: -1 });
Note.dropIndex('userId').catch(() => {});

export default Note;

export function isValidCw(text: string): boolean {
	return length(text.trim()) <= 500;
}

export type INote = {
	_id: mongo.ObjectID;
	createdAt: Date;
	deletedAt?: Date;
	updatedAt?: Date;
	fileIds: mongo.ObjectID[];
	replyId: mongo.ObjectID;
	renoteId: mongo.ObjectID;
	poll: IPoll;
	name?: string;
	text: string;
	tags: string[];
	tagsLower: string[];
	emojis: string[];
	cw: string;
	userId: mongo.ObjectID;
	appId?: mongo.ObjectID;
	viaMobile: boolean;
	localOnly: boolean;
	copyOnce?: boolean;
	renoteCount: number;
	repliesCount: number;
	quoteCount?: number;
	reactionCounts: Record<string, number>;
	mentions: mongo.ObjectID[];
	mentionedRemoteUsers: {
		uri: string;
		url?: string;
		username: string;
		host: string;
	}[];

	/**
	 * public ... 公開
	 * home ... ホームタイムライン(ユーザーページのタイムライン含む)のみに流す
	 * followers ... フォロワーのみ
	 * specified ... visibleUserIds で指定したユーザーのみ
	 */
	visibility: 'public' | 'home' | 'followers' | 'specified';

	visibleUserIds: mongo.ObjectID[];

	geo: {
		coordinates: number[];
		altitude: number;
		accuracy: number;
		altitudeAccuracy: number;
		heading: number;
		speed: number;
	};

	/**
	 * AP Object ID
	 */
	uri?: string;

	/**
	 * AP url
	 */
	url?: string;

	/**
	 * 人気の投稿度合いを表すスコア
	 */
	score: number;

	/**
	 * MeCab index
	 */
	mecabWords?: string[];
	trendWords?: string[];

	// 非正規化
	_reply?: {
		userId: mongo.ObjectID;
		user: {
			host: string;
		};
	};
	_renote?: {
		userId: mongo.ObjectID;
		user: {
			host: string;
		};
	};
	_user: {
		host: string;
		inbox?: string;
	};
	_files?: IDriveFile[];

	// Lookuped
	__user?: IUser;
};

export type IPoll = {
	choices: IChoice[];
	multiple?: boolean;
	expiresAt?: Date | null;
};

export type IChoice = {
	id: number;
	text: string;
	votes: number;
};

export const hideNote = async (packedNote: PackedNote, meId: mongo.ObjectID | null) => {
	let hide = false;

	// visibility が private かつ投稿者のIDが自分のIDではなかったら非表示(後方互換性のため)
	if (packedNote.visibility == 'private' && (meId == null || !meId.equals(packedNote.userId))) {
		hide = true;
	}

	// visibility が specified かつ自分が指定されていなかったら非表示
	if (packedNote.visibility == 'specified') {
		if (meId == null) {
			hide = true;
		} else if (meId.equals(packedNote.userId)) {
			hide = false;
		} else {
			// 指定されているかどうか
			const specified = packedNote.visibleUserIds.some((id: any) => meId.equals(id));

			if (specified) {
				hide = false;
			} else {
				hide = true;
			}
		}
	}

	// visibility が followers かつ自分が投稿者のフォロワーでなかったら非表示
	if (packedNote.visibility == 'followers') {
		if (meId == null) {
			hide = true;
		} else if (meId.equals(packedNote.userId)) {
			hide = false;
		} else if (packedNote.reply && meId.equals(packedNote.reply.userId)) {
			// 自分の投稿に対するリプライ
			hide = false;
		} else if (packedNote.mentions && packedNote.mentions.some((id: any) => meId.equals(id))) {
			// 自分へのメンション
			hide = false;
		} else {
			// フォロワーかどうか
			const following = await Following.findOne({
				followeeId: transform(packedNote.userId),
				followerId: meId
			});

			if (following == null) {
				hide = true;
			} else {
				hide = false;
			}
		}
	}

	if (hide) {
		packedNote.fileIds = [];
		packedNote.files = [];
		packedNote.replyId = null;
		packedNote.reply = null;
		packedNote.appId = null;
		packedNote.visibleUserIds = [];
		packedNote.reactionCounts = {};
		packedNote.renoteCount = 0;
		packedNote.repliesCount = 0;
		packedNote.text = null;
		packedNote.poll = null;
		packedNote.cw = null;
		packedNote.tags = [];
		packedNote.isHidden = true;
	}
};

export const packMany = async (
	notes: (string | mongo.ObjectID | INote)[],
	me?: string | mongo.ObjectID | IUser | null,
	options?: {
		detail?: boolean;
		skipHide?: boolean;
		removeError?: boolean;
	}
) => {
	const items = await Promise.all(notes.map(n => pack(n, me, options)));
	return (options && options.removeError) ? items.filter(x => x != null) : items;
};

/**
 * Pack a note for API response
 *
 * @param note target
 * @param me? serializee
 * @param options? serialize options
 * @return response
 */
export const pack = async (
	src: string | mongo.ObjectID | INote,
	me?: string | mongo.ObjectID | IUser | null,
	options?: {
		detail?: boolean;
		skipHide?: boolean;
	}
): Promise<PackedNote | null> => {
	const opts = Object.assign({
		detail: true,
		skipHide: false
	}, options);

	// Me
	const meId: mongo.ObjectID | null = me
		? isObjectId(me)
			? me as mongo.ObjectID
			: typeof me === 'string'
				? new mongo.ObjectID(me)
				: (me as IUser)._id
		: null;

	let db: INote | undefined;

	// Populate the note if 'note' is ID
	if (isObjectId(src)) {
		db = await Note.findOne({
			_id: src
		});
	} else if (typeof src === 'string') {
		db = await Note.findOne({
			_id: new mongo.ObjectID(src)
		});
	} else {
		db = deepcopy(src);
	}

	// (データベースの欠損などで)投稿がデータベース上に見つからなかったとき
	if (db == null) {
		dbLogger.warn(`[DAMAGED DB] (missing) pkg: note :: ${src}`);
		return null;
	}

	const reactionCounts = db.reactionCounts ? decodeReactionCounts(db.reactionCounts) : {};

	const populateEmojis = async () => {
		// _note._userを消す前か、_note.userを解決した後でないとホストがわからない
		if (db!._user) {
			const host = db!._user.host;
			const rs = Object.keys(reactionCounts)
				.filter(x => x && x.startsWith(':'))
				.map(x => decodeReaction(x))
				.map(x => x.replace(/:/g, ''));

			return packEmojis(db!.emojis.concat(rs), host)
				.catch(e => {
					console.warn(e);
					return [];
				});
		} else {
			return [];
		}
	};

	const populatePoll = async () => {
		const poll = db!.poll;
		if (poll.multiple) {
			const votes = await PollVote.find({
				userId: meId,
				noteId: db!._id
			});

			const myChoices = (poll.choices as IChoice[]).filter(x => votes.some(y => x.id == y.choice));
			for (const myChoice of myChoices) {
				(myChoice as any).isVoted = true;
			}

			return poll;
		} else {
			poll.multiple = false;
		}

		const vote = await PollVote
			.findOne({
				userId: meId,
				noteId: db!._id
			});

		if (vote) {
			const myChoice = (poll.choices as IChoice[])
				.filter(x => x.id == vote.choice)[0] as any;

			myChoice.isVoted = true;
		}

		return poll;
	};

	const populateMyReaction = async () => {
		const reaction = await NoteReaction
			.findOne({
				userId: meId,
				noteId: db!._id,
				deletedAt: { $exists: false }
			});

		if (reaction) {
			return decodeReaction(reaction.reaction);
		}

		return null;
	};

	const populateMyRenote = async () => {
		const renote = await Note.findOne({
			userId: meId,
			renoteId: db!._id,
			text: null,
			poll: null,
			'fileIds.0': { $exists: false },
			deletedAt: { $exists: false }
		}, {
			_id: 1
		});

		return renote ? `${renote._id}` : null;
	};

	const nodes = db.text ? parseFull(db.text) : [];

	// 互換性のため。(古いMisskeyではNoteにemojisが無い)
	if (db.emojis == null && nodes) {
		db.emojis = extractEmojis(nodes);
	}

	const packed: PackedNote = await awaitAll({
		id: toOidString(db._id),
		createdAt: toISODateOrNull(db.createdAt),
		deletedAt: toISODateOrNull(db.deletedAt),
		updatedAt: toISODateOrNull(db.updatedAt),
		text: db.text,
		cw: db.cw,
		userId: toOidString(db.userId),
		user: packUser(db.__user as IUser || db.userId, meId),
		replyId: db.replyId ? `${db.replyId}` : null,
		renoteId: db.renoteId ? `${db.renoteId}` : null,
		viaMobile: !!db.viaMobile,
		visibility: db.visibility,
		tags: db.tags.length > 0 ? db.tags : [],
		localOnly: !!db.localOnly,
		copyOnce: !!db.copyOnce,
		score: db.score || 0,
		renoteCount: db.renoteCount || 0,
		quoteCount: db.quoteCount || 0,
		repliesCount: db.repliesCount || 0,
		reactions: reactionCounts,
		reactionCounts: reactionCounts,
		emojis: populateEmojis(),
		fileIds: db.fileIds ? db.fileIds.map(toOidString) : [],
		files: packFileMany(db.fileIds || []),
		uri: db.uri || null,
		url: db.url || null,
		appId: toOidStringOrNull(db.appId),
		app: db.appId ? packApp(db.appId) : null,

		visibleUserIds: db.visibleUserIds?.length > 0 ? db.visibleUserIds.map(toOidString) : [],
		mentions: db.mentions?.length > 0 ? db.mentions.map(toOidString) : [],
		hasRemoteMentions: db.mentionedRemoteUsers?.length > 0,

		...(opts.detail ? {
			reply: (opts.detail && db.replyId) ? pack(db.replyId, meId, {
				detail: false
			}) : null,

			renote: db.renoteId ? pack(db.renoteId, meId, {
				detail: true
			}) : null,

			poll: db.poll ? populatePoll() : null,

			...(meId ? {
				myReaction: populateMyReaction(),
				myRenoteId: populateMyRenote(),
			} : {})
		} : {})
	});

	if (nodes) {
		const mfmTypes = extractMfmTypes(nodes);
		const decorationMfmTypes = mfmTypes.filter(x => !['text', 'mention', 'hashtag', 'url', 'link', 'emoji', 'blockCode', 'inlineCode'].includes(x)) || [];
		packed.notHaveDecorationMfm = decorationMfmTypes.length === 0;
	}

	if (packed.user?.isCat) {
		if (packed.text) packed.text = nyaize(packed.text);
		if (packed.cw) packed.cw = nyaize(packed.cw);
		if (packed.poll?.choices) {
			for (const c of packed.poll.choices) {
				if (c.text) c.text = nyaize(c.text);
			}
		}
	}

	if (!opts.skipHide) {
		await hideNote(packed, meId);
	}

	//#region (データベースの欠損などで)参照しているデータがデータベース上に見つからなかったとき
	if (packed.user == null) {
		dbLogger.warn(`[DAMAGED DB] (missing) pkg: note -> user :: ${packed.id} (user ${packed.userId})`);
		return null;
	}

	if (opts.detail) {
		if (packed.replyId != null && packed.reply == null) {
			packed.replyId = null;
		}

		if (packed.renoteId != null && packed.renote == null) {
			packed.renoteId = null;
		}
	}
	//#endregion

	return packed;
}
