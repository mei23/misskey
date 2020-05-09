import { IUser, isLocalUser, isRemoteUser } from '../../../models/user';
import Note, { INote } from '../../../models/note';
import NoteReaction from '../../../models/note-reaction';
import { publishNoteStream } from '../../stream';
import { renderLike } from '../../../remote/activitypub/renderer/like';
import renderUndo from '../../../remote/activitypub/renderer/undo';
import { renderActivity } from '../../../remote/activitypub/renderer';
import { deliverToUser, deliverToFollowers } from '../../../remote/activitypub/deliver-manager';
import { IdentifiableError } from '../../../misc/identifiable-error';
import { decodeReaction } from '../../../misc/reaction-lib';
import { deliverToRelays } from '../../relay';

export default async (user: IUser, note: INote) => {
	// if already unreacted
	const exist = await NoteReaction.findOne({
		noteId: note._id,
		userId: user._id,
		deletedAt: { $exists: false }
	});

	if (exist === null) {
		throw new IdentifiableError('60527ec9-b4cb-4a88-a6bd-32d3ad26817d', 'not reacted');
	}

	// Delete reaction
	const result = await NoteReaction.remove({
		_id: exist._id
	});

	if (result.deletedCount !== 1) {
		throw new IdentifiableError('60527ec9-b4cb-4a88-a6bd-32d3ad26817d', 'not reacted');
	}

	const dec: any = {};
	dec[`reactionCounts.${exist.reaction}`] = -1;

	// Decrement reactions count
	Note.update({ _id: note._id }, {
		$inc: dec
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
