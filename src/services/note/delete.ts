import Note, { INote } from '../../models/note';
import User, { IUser, isLocalUser, isRemoteUser, IRemoteUser } from '../../models/user';
import { publishNoteStream } from '../stream';
import renderDelete from '../../remote/activitypub/renderer/delete';
import renderUndo from '../../remote/activitypub/renderer/undo';
import { renderActivity } from '../../remote/activitypub/renderer';
import renderTombstone from '../../remote/activitypub/renderer/tombstone';
import renderAnnounce from '../../remote/activitypub/renderer/announce';
import notesChart from '../../services/chart/notes';
import perUserNotesChart from '../../services/chart/per-user-notes';
import config from '../../config';
import NoteUnread from '../../models/note-unread';
import read from './read';
import DriveFile from '../../models/drive-file';
import { registerOrFetchInstanceDoc } from '../register-or-fetch-instance-doc';
import Instance from '../../models/instance';
import instanceChart from '../../services/chart/instance';
import Favorite from '../../models/favorite';
import DeliverManager, { deliverToFollowers } from '../../remote/activitypub/deliver-manager';
import { deliverToRelays } from '../relay';
import Notification from '../../models/notification';
import { deleteUnusedFile } from '../drive/delete-unused-file';
import isQuote from '../../misc/is-quote';
import NoteReaction from '../../models/note-reaction';

/**
 * 投稿を削除します。
 * @param user 投稿者
 * @param note 投稿
 */
export default async function(user: IUser, note: INote, quiet = false) {
	const deletedAt = new Date();

	await Note.update({
		_id: note._id,
		userId: user._id
	}, {
		$set: {
			deletedAt: deletedAt,
			text: null,
			mecabWords: [],
			trendWords: [],
			tags: [],
			fileIds: [],
			renoteId: null,
			poll: null,
			geo: null,
			cw: null
		}
	});

	if (note.renoteId) {
		Note.update({ _id: note.renoteId }, {
			$inc: {
				renoteCount: -1,
				quoteCount: isQuote(note) ? -1 : 0,
				score: user.isBot ? 0 : -1
			},
			$pull: {
				_quoteIds: note._id
			}
		});
	}

	// この投稿が関わる未読通知を削除
	NoteUnread.find({
		noteId: note._id
	}).then(unreads => {
		for (const unread of unreads) {
			read(unread.userId, unread.noteId);
		}
	});

	// この投稿をお気に入りから削除
	Favorite.remove({
		noteId: note._id
	});

	Notification.remove({
		noteId: note._id
	});

	NoteReaction.remove({
		noteId: note._id
	});

	// ファイルが添付されていた場合ドライブのファイルの「このファイルが添付された投稿一覧」プロパティからこの投稿を削除
	if (note.fileIds) {
		for (const fileId of note.fileIds) {
			DriveFile.update({ _id: fileId }, {
				$pull: {
					'metadata.attachedNoteIds': note._id
				}
			});

			// リモートユーザーの場合はもう参照されてないファイルか確認
			if (isRemoteUser(user)) {
				deleteUnusedFile(fileId);
			}
		}
	}

	// このNoteに対するPureRenoteを削除
	Note.remove({
		$and: [
			{ renoteId: note._id },
			{ text: null },
			{ fileIds: [] },
			{ poll: null }
		]
	}, {
		multi: true
	});

	if (!quiet) {
		publishNoteStream(note._id, 'deleted', {
			deletedAt: deletedAt
		});

		// renote解除の場合は、renote解除されたnoteに向けてunrenoted
		if (note.renoteId) {
			publishNoteStream(note.renoteId, 'unrenoted', {
				renoteeId: user._id	// renote解除した人
			});
		}

		//#region ローカルの投稿なら削除アクティビティを配送
		if (isLocalUser(user) && !note.localOnly) {
			(async () => {
				let renote: INote | undefined;

				if (note.renoteId && note.text == null && note.poll == null && (note.fileIds == null || note.fileIds.length == 0)) {
					renote = await Note.findOne({
						_id: note.renoteId
					});
				}

				const content = renderActivity(renote
					? renderUndo(renderAnnounce(renote.uri || `${config.url}/notes/${renote._id}`, note), user)
					: renderDelete(renderTombstone(`${config.url}/notes/${note._id}`), user, `${config.url}/notes/${note._id}/delete`));

				deliverToFollowers(user, content);
				deliverToRelays(user, content);

				const dm = new DeliverManager(user, content);

				// メンションされたリモートユーザーに配送 (Replay, DM 含む)
				for (const u of note.mentionedRemoteUsers || []) {
					const user = await User.findOne({
						uri: u.uri
					});

					if (user) dm.addDirectRecipe(user as IRemoteUser);
				}

				// 投稿がRenote/QuoteかつRenote元の投稿の投稿者がリモートユーザーなら配送
				if (note.renoteId && note._renote?.userId) {
					const user = await User.findOne({
						_id: note._renote.userId
					});

					if (user) dm.addDirectRecipe(user as IRemoteUser);
				}

				dm.execute();
			})();
		}
		//#endregion

		// 統計を更新
		notesChart.update(note, false);
		perUserNotesChart.update(user, note, false);

		if (isRemoteUser(user)) {
			registerOrFetchInstanceDoc(user.host).then(i => {
				Instance.update({ _id: i._id }, {
					$inc: {
						notesCount: -1
					}
				});

				instanceChart.updateNote(i.host, false);
			});
		}
	}
}
