import User, { IUser, isLocalUser, isRemoteUser } from '../../../models/user';
import Note, { INote, pack } from '../../../models/note';
import NoteReaction, { INoteReaction } from '../../../models/note-reaction';
import { publishNoteStream, publishHotStream } from '../../stream';
import { createNotification } from '../../create-notification';
import NoteWatching from '../../../models/note-watching';
import watch from '../watch';
import { renderLike } from '../../../remote/activitypub/renderer/like';
import { deliverToUser, deliverToFollowers } from '../../../remote/activitypub/deliver-manager';
import { renderActivity } from '../../../remote/activitypub/renderer';
import perUserReactionsChart from '../../../services/chart/per-user-reactions';
import { toDbReaction, decodeReaction } from '../../../misc/reaction-lib';
import deleteReaction from './delete';
import { packEmojis } from '../../../misc/pack-emojis';
import Meta from '../../../models/meta';

export default async (user: IUser, note: INote, reaction?: string, dislike = false): Promise<INoteReaction> => {
	reaction = await toDbReaction(reaction, true, user.host);

	const exist = await NoteReaction.findOne({
		noteId: note._id,
		userId: user._id,
		deletedAt: { $exists: false }
	});

	if (exist) {
		if (exist.reaction !== reaction) {
			await deleteReaction(user, note);
		} else {
			return exist;
		}
	}

	const inserted = await NoteReaction.insert({
		createdAt: new Date(),
		noteId: note._id,
		userId: user._id,
		reaction,
		dislike
	});

	// Increment reactions count
	await Note.update({ _id: note._id }, {
		$inc: {
			[`reactionCounts.${reaction}`]: 1,
			score: (user.isBot || inserted.dislike) ? 0 : 1
		}
	});

	perUserReactionsChart.update(user, note);

	incReactionsCount(user);

	const decodedReaction = decodeReaction(reaction);
	const emoji = (await packEmojis([decodedReaction.replace(/:/g, '')], note._user.host))[0];

	publishNoteStream(note._id, 'reacted', {
		reaction: decodedReaction,
		emoji: emoji,
		userId: user._id
	});

	if (note.reactionCounts == null) {
		(async () => {
			const fresh = (await Note.findOne({ _id: note._id }))!;
			publishHotStream((await pack(fresh))!);
		})();
	}

	// リアクションされたユーザーがローカルユーザーなら通知を作成
	if (isLocalUser(note._user)) {
		createNotification(note.userId, user._id, 'reaction', {
			noteId: note._id,
			reaction: reaction
		});
	}

	// Fetch watchers
	NoteWatching
		.find({
			noteId: note._id,
			userId: { $ne: user._id }
		}, {
			fields: {
				userId: true
			}
		})
		.then(watchers => {
			for (const watcher of watchers) {
				createNotification(watcher.userId, user._id, 'reaction', {
					noteId: note._id,
					reaction: reaction
				});
			}
		});

	// ユーザーがローカルユーザーかつ自動ウォッチ設定がオンならばこの投稿をWatchする
	if (isLocalUser(user) && user.settings.autoWatch !== false) {
		watch(user._id, note);
	}

	//#region 配信
	if (isLocalUser(user) && !note.localOnly && !user.noFederation) {
		const content = renderActivity(await renderLike(inserted, note), user);
		if (isRemoteUser(note._user)) deliverToUser(user, content, note._user);
		deliverToFollowers(user, content, true);
		//deliverToRelays(user, content);
	}
	//#endregion

	return inserted;
};

function incReactionsCount(user: IUser) {
	if (isLocalUser(user)) {
		Meta.update({}, {
			$inc: {
				'stats.reactionsCount': 1,
				//'stats.originalReactionsCount': 1
			}
		}, { upsert: true });
	} else {
		/*
		Meta.update({}, {
			$inc: {
				'stats.originalReactionsCount': 1
			}
		}, { upsert: true });
		*/
	}
}
