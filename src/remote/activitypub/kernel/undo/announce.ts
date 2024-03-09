import * as mongo from 'mongodb';
import { IRemoteUser } from '../../../../models/user';
import { IAnnounce, getApId } from '../../type';
import deleteNote from '../../../../services/note/delete';
import Note, { INote } from '../../../../models/note';
import { isSelfOrigin } from '../../../../misc/convert-host';

export const undoAnnounce = async (actor: IRemoteUser, activity: IAnnounce): Promise<string> => {
	const targetUri = getApId(activity.object);

	let note: INote | undefined;

	if (isSelfOrigin(targetUri)) {
		// 対象がローカルの場合
		const id = new mongo.ObjectID(targetUri.split('/').pop());
		note = await Note.findOne({
			userId: actor._id,
			renoteId: id,
			deletedAt: { $exists: false }
		});

		if (!note) {
			return `skip: target renote is not found`;
		}
	} else {
		// 対象がリモートの場合
		const targetNote = await Note.findOne({
			uri: targetUri
		});

		if (!targetNote) {
			return `skip: target note is not found`;
		}

		note = await Note.findOne({
			userId: actor._id,
			renoteId: targetNote._id,
			deletedAt: { $exists: false }
		});

		if (!note) {
			return `skip: target renote is not found`;
		}
	}

	await deleteNote(actor, note);
	return `ok`;
};
