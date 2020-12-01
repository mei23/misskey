import es from '../../db/elasticsearch';
import Note, { pack, INote, IChoice } from '../../models/note';
import User, { isLocalUser, IUser, isRemoteUser, IRemoteUser, ILocalUser, getMute } from '../../models/user';
import { publishMainStream, publishNotesStream } from '../stream';
import { createDeleteNoteJob, createNotifyPollFinishedJob } from '../../queue';
import renderNote from '../../remote/activitypub/renderer/note';
import renderCreate from '../../remote/activitypub/renderer/create';
import renderAnnounce from '../../remote/activitypub/renderer/announce';
import { renderActivity } from '../../remote/activitypub/renderer';
import DriveFile, { IDriveFile } from '../../models/drive-file';
import { createNotification } from '../../services/create-notification';
import NoteWatching from '../../models/note-watching';
import watch from './watch';
import { parse } from '../../mfm/parse';
import { IApp } from '../../models/app';
import resolveUser from '../../remote/resolve-user';
import Meta from '../../models/meta';
import config from '../../config';
import { updateHashtags } from '../update-hashtag';
import isQuote from '../../misc/is-quote';
import notesChart from '../../services/chart/notes';
import perUserNotesChart from '../../services/chart/per-user-notes';
import activeUsersChart from '../../services/chart/active-users';
import instanceChart from '../../services/chart/instance';

import { erase, concat, unique } from '../../prelude/array';
import insertNoteUnread from './unread';
import { registerOrFetchInstanceDoc } from '../register-or-fetch-instance-doc';
import Instance from '../../models/instance';
import { toASCII } from 'punycode';
import extractMentions from '../../misc/extract-mentions';
import extractEmojis from '../../misc/extract-emojis';
import extractHashtags from '../../misc/extract-hashtags';
import { genId } from '../../misc/gen-id';
import DeliverManager from '../../remote/activitypub/deliver-manager';
import { deliverToRelays } from '../relay';
import { getIndexer, getWordIndexer } from '../../misc/mecab';
import Following from '../../models/following';

type NotificationType = 'reply' | 'renote' | 'quote' | 'mention' | 'highlight';

class NotificationManager {
	private notifier: IUser;
	private note: INote;
	private queue: {
		target: ILocalUser['_id'];
		reason: NotificationType;
	}[];

	constructor(notifier: IUser, note: INote) {
		this.notifier = notifier;
		this.note = note;
		this.queue = [];
	}

	public push(notifiee: ILocalUser['_id'], reason: NotificationType) {
		// 自分自身へは通知しない
		if (this.notifier._id.equals(notifiee)) return;

		const exist = this.queue.find(x => x.target.equals(notifiee) && x.reason == 'reply');

		if (exist) {
			// すでにreplyされている場合は後続のreply, mentionはスキップ
			if (reason == 'mention' || reason == 'reply') {
				return;
			}
		}

		const existMention = this.queue.find(x => x.target.equals(notifiee) && x.reason == 'mention');

		if (existMention) {
			if (reason == 'quote') {
				return;
			}
		}

		this.queue.push({
			reason: reason,
			target: notifiee
		});
	}

	public async deliver() {
		// サイレンスされていたらスキップ
		if (this.notifier.isSilenced) {
			return;
		}

		for (const x of this.queue) {
			// ミュートされてたらスキップ
			const mute = await getMute(x.target, this.notifier._id);
			if (mute) {
				continue;
			}

			createNotification(x.target, this.notifier._id, x.reason, {
				noteId: this.note._id
			});
		}
	}
}

type Option = {
	createdAt?: Date;
	name?: string;
	text?: string;
	reply?: INote;
	renote?: INote;
	files?: IDriveFile[];
	geo?: any;
	poll?: any;
	viaMobile?: boolean;
	localOnly?: boolean;
	copyOnce?: boolean;
	cw?: string;
	visibility?: string;
	visibleUsers?: IUser[];
	apMentions?: IUser[];
	apHashtags?: string[];
	apEmojis?: string[];
	uri?: string;
	url?: string;
	app?: IApp;
	preview?: boolean;
};

export default async (user: IUser, data: Option, silent = false) => {
	if (config.disablePosts) throw { status: 451 };

	const isFirstNote = user.notesCount === 0;
	const isPureRenote = data.text == null && data.poll == null && (data.files == null || data.files.length == 0);

	if (data.createdAt == null) data.createdAt = new Date();
	if (data.visibility == null) data.visibility = 'public';
	if (data.viaMobile == null) data.viaMobile = false;
	if (data.localOnly == null) data.localOnly = false;
	if (data.copyOnce == null) data.copyOnce = false;

	if (data.visibleUsers) {
		data.visibleUsers = erase(null, data.visibleUsers);
	}

	// 本文/CW/投票のハードリミット
	// サロゲートペアは2文字扱い/合字は複数文字扱いでかける
	if (data.text && data.text.length > 16384) {
		throw 'text limit exceeded';
	}
	if (data.cw && data.cw.length > 16384) {
		throw 'cw limit exceeded';
	}
	if (data.poll && JSON.stringify(data.poll).length > 16384) {
		throw 'poll limit exceeded';
	}

	// リプライ対象が削除された投稿だったらreject
	if (data.reply && data.reply.deletedAt != null) {
		throw 'Reply target has been deleted';
	}

	// Renote/Quote対象が削除された投稿だったらreject
	if (data.renote && data.renote.deletedAt != null) {
		throw 'Renote target has been deleted';
	}

	// Renote/Quote対象が「ホームまたは全体」以外の公開範囲ならreject
	if (data.renote && data.renote.visibility != 'public' && data.renote.visibility != 'home') {
		throw 'Renote target is not public or home';
	}

	// PureRenoteの最大公開範囲はHomeにする
	if (isPureRenote && data.visibility === 'public') {
		data.visibility = 'home';
	}

	// ローカルのみをRenoteしたらローカルのみにする
	if (data.renote && data.renote.localOnly) {
		data.localOnly = true;
	}

	// ローカルのみにリプライしたらローカルのみにする
	if (data.reply && data.reply.localOnly) {
		data.localOnly = true;
	}

	if (data.copyOnce && data.localOnly) {
		data.copyOnce = false;
	}

	if (data.text) {
		data.text = data.text.trim();
	}

	let tags = data.apHashtags;
	let emojis = data.apEmojis;
	let mentionedUsers = data.apMentions;

	const parseEmojisInToken = true;

	// Parse MFM if needed
	if (parseEmojisInToken || !tags || !emojis || !mentionedUsers) {
		const tokens = data.text ? parse(data.text) : [];
		const cwTokens = data.cw ? parse(data.cw) : [];
		const choiceTokens = data.poll && data.poll.choices
			? concat((data.poll.choices as IChoice[]).map(choice => parse(choice.text)))
			: [];

		const combinedTokens = tokens.concat(cwTokens).concat(choiceTokens);

		tags = data.apHashtags || extractHashtags(combinedTokens);

		emojis = unique(concat([data.apEmojis || [], extractEmojis(combinedTokens)]));

		mentionedUsers = data.apMentions || await extractMentionedUsers(user, combinedTokens);
	}

	tags = tags.filter(tag => Array.from(tag || '').length <= 128).splice(0, 64);

	const normalizeAsciiHost = (host: string) => {
		if (host == null) return null;
		return toASCII(host.toLowerCase());
	};

	const mentionEmojis = mentionedUsers.map(user => `@${user.usernameLower}` + (user.host != null ? `@${normalizeAsciiHost(user.host)}` : ''));
	emojis = emojis.concat(mentionEmojis);

	if (data.reply && !user._id.equals(data.reply.userId) && !mentionedUsers.some(u => u._id.equals(data.reply.userId))) {
		mentionedUsers.push(await User.findOne({ _id: data.reply.userId }));
	}

	if (data.visibility == 'specified') {
		for (const u of data.visibleUsers) {
			if (!mentionedUsers.some(x => x._id.equals(u._id))) {
				mentionedUsers.push(u);
			}
		}

		for (const u of mentionedUsers) {
			if (!data.visibleUsers.some(x => x._id.equals(u._id))) {
				data.visibleUsers.push(u);
			}
		}
	}

	const note = await insertNote(user, data, tags, emojis, mentionedUsers);

	(async () => {
		if (data.preview) return;

		if (note == null) {
			return;
		}

		if (isLocalUser(user)) {
			queueDelete(note, tags);
		}

		// 統計を更新
		notesChart.update(note, true);
		perUserNotesChart.update(user, note, true);
		// ローカルユーザーのチャートはタイムライン取得時に更新しているのでリモートユーザーの場合だけでよい
		if (isRemoteUser(user)) activeUsersChart.update(user);

		// Register host
		if (isRemoteUser(user)) {
			registerOrFetchInstanceDoc(user.host).then(i => {
				Instance.update({ _id: i._id }, {
					$inc: {
						notesCount: 1
					}
				});

				instanceChart.updateNote(i.host, true);
			});
		}

		// ハッシュタグ更新
		updateHashtags(user, tags);

		// ファイルが添付されていた場合ドライブのファイルの「このファイルが添付された投稿一覧」プロパティにこの投稿を追加
		if (data.files) {
			for (const file of data.files) {
				DriveFile.update({ _id: file._id }, {
					$push: {
						'metadata.attachedNoteIds': note._id
					}
				});
			}
		}

		// Increment notes count
		incNotesCount(user);

		// Increment notes count (user)
		incNotesCountOfUser(user);

		// 未読通知を作成
		if (data.visibility == 'specified') {
			for (const u of data.visibleUsers) {
				insertNoteUnread(u, note, true);
			}
		} else {
			for (const u of mentionedUsers) {
				insertNoteUnread(u, note, false);
			}
		}

		if (data.reply) {
			saveReply(data.reply, note);
		}

		if (data.renote) {
			incRenoteCount(data.renote, user);
		}

		if (isQuote(note)) {
			saveQuote(data.renote, note);
		}

		// Pack the note
		const noteObj = await pack(note);

		if (isFirstNote) {
			noteObj.isFirstNote = true;
		}

		publishNotesStream(noteObj);
		//publishHotStream(noteObj);

		const nm = new NotificationManager(user, note);
		const nmRelatedPromises = [];

		// Extended notification
		if (note.visibility === 'public' || note.visibility === 'home' || note.visibility === 'followers') {
			nmRelatedPromises.push(notifyExtended(note, nm));
		}

		// If has in reply to note
		if (data.reply) {
			// Fetch watchers
			nmRelatedPromises.push(notifyToWatchersOfReplyee(data.reply, user, nm));

			// この投稿をWatchする
			if (isLocalUser(user) && user.settings.autoWatch !== false) {
				watch(user._id, data.reply);
			}

			// 通知
			if (isLocalUser(data.reply._user)) {
				nm.push(data.reply.userId, 'reply');
				publishMainStream(data.reply.userId, 'reply', noteObj);
			}
		}

		// mention
		await createMentionedEvents(mentionedUsers, note, nm);

		// If it is renote
		if (data.renote) {
			const type = data.text ? 'quote' : 'renote';

			// Notify
			if (isLocalUser(data.renote._user)) {
				nm.push(data.renote.userId, type);
			}

			// Fetch watchers
			nmRelatedPromises.push(notifyToWatchersOfRenotee(data.renote, user, nm, type));

			// この投稿をWatchする
			if (isLocalUser(user) && user.settings.autoWatch !== false) {
				watch(user._id, data.renote);
			}

			// Publish event
			if (!user._id.equals(data.renote.userId) && isLocalUser(data.renote._user)) {
				publishMainStream(data.renote.userId, 'renote', noteObj);
			}
		}

		Promise.all(nmRelatedPromises).then(() => {
			nm.deliver();
		});

		// AP deliver
		if (isLocalUser(user)) {
			(async () => {
				const noteActivity = await renderNoteOrRenoteActivity(data, note, user);
				const dm = new DeliverManager(user, noteActivity);

				// メンションされたリモートユーザーに配送
				for (const u of mentionedUsers.filter(u => isRemoteUser(u))) {
					dm.addDirectRecipe(u as IRemoteUser);
				}

				if (!silent) {
					// 投稿がリプライかつ投稿者がローカルユーザーかつリプライ先の投稿の投稿者がリモートユーザーなら配送
					if (data.reply && isRemoteUser(data.reply._user)) {
						dm.addDirectRecipe(data.reply._user);
					}

					// 投稿がRenoteかつ投稿者がローカルユーザーかつRenote元の投稿の投稿者がリモートユーザーなら配送
					if (data.renote && isRemoteUser(data.renote._user)) {
						dm.addDirectRecipe(data.renote._user);
					}

					// フォロワーへ配送
					if (['public', 'home', 'followers'].includes(note.visibility)) {
						dm.addFollowersRecipe();
					}

					// リレーへ配送
					if (['public'].includes(note.visibility) && !note.copyOnce) {
						deliverToRelays(user, noteActivity);
					}

					// リモートのみ配送
					if (note.visibility === 'specified' && note.copyOnce) {
						dm.addFollowersRecipe();
					}
				}

				dm.execute();
			})();
		}

		// Register to search database
		index(note);

		if (isLocalUser(user) && note.poll && note.poll.expiresAt) {
			createNotifyPollFinishedJob(note, user, note.poll.expiresAt);
		}

	})();

	return note;
};

async function queueDelete(note: INote, tags: string[]) {
	for (const tag of tags) {
		const m = tag.match(/^exp(\d{1,5})([smh])$/);
		if (!m) continue;

		let delay = 1000 * Number(m[1]) * (m[2] === 'm' ? 60 : m[2] === 'h' ? 3600 : 1);
		if (delay < 5) delay = 5;
		if (delay > 86400) delay = 86400;

		await createDeleteNoteJob(note, delay);
		break;
	}
}

async function renderNoteOrRenoteActivity(data: Option, note: INote, user: IUser) {
	if (data.localOnly) return null;
	if (user.noFederation) return null;

	const content = data.renote && data.text == null && data.poll == null && (data.files == null || data.files.length == 0)
		? renderAnnounce(data.renote.uri ? data.renote.uri : `${config.url}/notes/${data.renote._id}`, note)
		: renderCreate(await renderNote(note, false), note);

	return renderActivity(content);
}

function incRenoteCount(renote: INote, user: IUser) {
	Note.update({ _id: renote._id }, {
		$inc: {
			renoteCount: 1,
			score: user.isBot ? 0 : 1
		}
	});
}

async function insertNote(user: IUser, data: Option, tags: string[], emojis: string[], mentionedUsers: IUser[]) {
	const insert: any = {
		_id: genId(data.createdAt),
		createdAt: data.createdAt,
		fileIds: data.files ? data.files.map(file => file._id) : [],
		replyId: data.reply ? data.reply._id : null,
		renoteId: data.renote ? data.renote._id : null,
		name: data.name,
		text: data.text,
		poll: data.poll,
		cw: data.cw == null ? null : data.cw,
		tags,
		tagsLower: tags.map(tag => tag.toLowerCase()),
		emojis,
		userId: user._id,
		viaMobile: data.viaMobile,
		localOnly: data.localOnly,
		copyOnce: data.copyOnce,
		geo: data.geo || null,
		appId: data.app ? data.app._id : null,
		visibility: data.visibility,
		visibleUserIds: data.visibility == 'specified'
			? data.visibleUsers
				? data.visibleUsers.map(u => u._id)
				: []
			: [],

		// 以下非正規化データ
		_reply: data.reply ? {
			userId: data.reply.userId,
			user: {
				host: data.reply._user.host
			}
		} : null,
		_renote: data.renote ? {
			userId: data.renote.userId,
			user: {
				host: data.renote._user.host
			}
		} : null,
		_user: {
			host: user.host,
			inbox: isRemoteUser(user) ? user.inbox : undefined
		},
		_files: data.files ? data.files : []
	};

	if (data.uri != null) insert.uri = data.uri;
	if (data.url != null) insert.url = data.url;

	// Append mentions data
	if (mentionedUsers.length > 0) {
		insert.mentions = mentionedUsers.map(u => u._id);
		insert.mentionedRemoteUsers = mentionedUsers.filter(u => isRemoteUser(u)).map(u => ({
			uri: (u as IRemoteUser).uri,
			url: (u as IRemoteUser).url,
			username: u.username,
			host: u.host
		}));
	}

	if (data.preview) {
		return Object.assign({
			preview: true
		}, insert) as INote;
	}

	// 投稿を作成
	try {
		return await Note.insert(insert);
	} catch (e) {
		// duplicate key error
		if (e.code === 11000) {
			return null;
		}

		throw e;
	}
}

function index(note: INote) {
	if (config.mecabSearch) {
		// for search
		getIndexer(note).then(mecabWords => {
			if (note.visibility === 'public' || note.visibility === 'home') {
				console.log(`Index: ${note._id} ${JSON.stringify(mecabWords)}`);
			}
			Note.findOneAndUpdate({ _id: note._id }, {
				$set: { mecabWords }
			});
		});

		// for trend
		if (note.visibility === 'public' || note.visibility === 'home') {
			getWordIndexer(note).then(trendWords => {
				console.log(`WordIndex: ${note._id} ${JSON.stringify(trendWords)}`);
				Note.findOneAndUpdate({ _id: note._id }, {
					$set: { trendWords }
				});
			});
		}
	}

	if (!note.text || !config.elasticsearch) return;

	if (es) {
		es.index({
			index: 'misskey',
			type: 'note',
			id: note._id.toString(),
			body: {
				text: note.text
			}
		});
	}
}

async function notifyToWatchersOfRenotee(renote: INote, user: IUser, nm: NotificationManager, type: NotificationType) {
	const watchers = await NoteWatching.find({
		noteId: renote._id,
		userId: { $ne: user._id }
	}, {
			fields: {
				userId: true
			}
		});

	for (const watcher of watchers) {
		nm.push(watcher.userId, type);
	}
}

async function notifyToWatchersOfReplyee(reply: INote, user: IUser, nm: NotificationManager) {
	const watchers = await NoteWatching.find({
		noteId: reply._id,
		userId: { $ne: user._id }
	}, {
			fields: {
				userId: true
			}
		});

	for (const watcher of watchers) {
		nm.push(watcher.userId, 'reply');
	}
}

async function notifyExtended(note: INote, nm: NotificationManager) {
	const text = note.text;
	if (!text) return;

	const us = await User.find({
		host: null,
		'clientSettings.highlightedWords': { $exists: true }
	});

	for (const u of us) {
		if (!isLocalUser(u)) continue;

		if (note.visibility === 'followers') {
			const followings = await Following.findOne({
				followerId: u._id,
				followeeId: note.userId
			});

			if (followings == null) return;
		}

		try {
			const words: string[] = u.clientSettings.highlightedWords.filter((q: string) => q != null && q.length > 0);

			const match = words.some(word => text.toLowerCase().includes(word.toLowerCase()));

			if (match) {
				nm.push(u._id, 'highlight');
			}
		} catch (e) {
			console.error(e);
		}
	}
}

async function createMentionedEvents(mentionedUsers: IUser[], note: INote, nm: NotificationManager) {
	for (const u of mentionedUsers.filter(u => isLocalUser(u))) {
		const detailPackedNote = await pack(note, u, {
			detail: true
		});

		publishMainStream(u._id, 'mention', detailPackedNote);

		// Create notification
		nm.push(u._id, 'mention');
	}
}

function saveQuote(renote: INote, note: INote) {
	Note.update({ _id: renote._id }, {
		$push: {
			_quoteIds: note._id
		}
	});
}

function saveReply(reply: INote, note: INote) {
	Note.update({ _id: reply._id }, {
		$inc: {
			repliesCount: 1
		}
	});
}

function incNotesCountOfUser(user: IUser) {
	User.update({ _id: user._id }, {
		$set: {
			updatedAt: new Date()
		},
		$inc: {
			notesCount: 1
		}
	});
}

function incNotesCount(user: IUser) {
	if (isLocalUser(user)) {
		Meta.update({}, {
			$inc: {
				'stats.notesCount': 1,
				'stats.originalNotesCount': 1
			}
		}, { upsert: true });
	} else {
		Meta.update({}, {
			$inc: {
				'stats.notesCount': 1
			}
		}, { upsert: true });
	}
}

async function extractMentionedUsers(user: IUser, tokens: ReturnType<typeof parse>): Promise<IUser[]> {
	if (tokens == null) return [];

	const mentions = extractMentions(tokens);

	let mentionedUsers =
		erase(null, await Promise.all(mentions.map(async m => {
			try {
				return await resolveUser(m.username, m.host ? m.host : user.host);
			} catch (e) {
				return null;
			}
		})));

	// Drop duplicate users
	mentionedUsers = mentionedUsers.filter((u, i, self) =>
		i === self.findIndex(u2 => u._id.equals(u2._id))
	);

	return mentionedUsers;
}
