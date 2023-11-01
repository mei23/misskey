import { IUser, isLocalUser, isRemoteUser } from '../../../models/user';
import Note, { INote } from '../../../models/note';
import NoteReaction from '../../../models/note-reaction';
import { publishNoteStream } from '../../stream';
import { renderLike } from '../../../remote/activitypub/renderer/like';
import renderUndo from '../../../remote/activitypub/renderer/undo';
import { renderActivity } from '../../../remote/activitypub/renderer';
import { deliverToUser, deliverToFollowers } from '../../../remote/activitypub/deliver-manager';
import { decodeReaction } from '../../../misc/reaction-lib';
import Notification from '../../../models/notification';

//#region Error
type ReactionDeleteErrorType = 'notReacted';

export class ReactionDeleteError extends Error {
	public type?: ReactionDeleteErrorType;
	constructor(type?: ReactionDeleteErrorType) {
		super('reaction delete error');
		this.name = 'ReactionDeleteError';
		this.type = type;
	}
}
//#endregion Error

export default async (user: IUser, note: INote) => {
	// if already unreacted
	const exist = await NoteReaction.findOne({
		noteId: note._id,
		userId: user._id,
		deletedAt: { $exists: false }
	});

	if (exist == null) {
		throw new ReactionDeleteError('notReacted');
	}

	// Delete reaction
	const result = await NoteReaction.remove({
		_id: exist._id
	});

	if (result.deletedCount !== 1) {
		throw new ReactionDeleteError('notReacted');
	}

	const dec: any = {};
	dec[`reactionCounts.${exist.reaction}`] = -1;
	dec.score = (user.isBot || exist.dislike) ? 0 : -1;

	// Decrement reactions count
	Note.update({ _id: note._id }, {
		$inc: dec
	});

	Notification.remove({
		noteId: note._id,
		notifierId: user._id,
		reaction: exist.reaction,
	});

	publishNoteStream(note._id, 'unreacted', {
		reaction: decodeReaction(exist.reaction),
		userId: user._id
	});

	//#region 配信
	if (isLocalUser(user) && !note.localOnly && !user.noFederation) {
		const content = renderActivity(renderUndo(await renderLike(exist, note), user), user);
		if (isRemoteUser(note._user)) deliverToUser(user, content, note._user);
		deliverToFollowers(user, content, true);
		//deliverToRelays(user, content);
	}
	//#endregion

	return;
};
