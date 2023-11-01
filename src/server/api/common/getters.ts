import * as mongo from 'mongodb';
import Note, { pack } from '../../../models/note';
import User, { isRemoteUser, isLocalUser, ILocalUser } from '../../../models/user';

//#region Error
type GetterErrorType = 'noSuchNote' | 'noSuchUser';

export class GetterError extends Error {
	public type?: GetterErrorType;
	constructor(type?: GetterErrorType) {
		super('getter error');
		this.name = 'GetterError';
		this.type = type;
	}
}
//#endregion Error

/**
 * Get note for API processing
 */
export async function getNote(noteId: mongo.ObjectID, user?: ILocalUser, visibleOnly = false) {
	const note = await Note.findOne({
		_id: noteId,
		'fileIds.100': { $exists: false },
		deletedAt: { $exists: false }
	});

	if (note == null) {
		throw new GetterError('noSuchNote');
	}

	if (visibleOnly && note.visibility !== 'public' && note.visibility !== 'home') {
		if (!user) throw new GetterError('noSuchNote');
		const packed = await pack(note, user);
		if (packed.isHidden) throw new GetterError('noSuchNote');
	}

	return note;
}

/**
 * Get user for API processing
 */
export async function getUser(userId: mongo.ObjectID) {
	const user = await User.findOne({
		_id: userId,
		$or: [{
			isDeleted: { $exists: false }
		}, {
			isDeleted: false
		}]
	}, {
		fields: {
			data: false,
			profile: false,
			clientSettings: false
		}
	});

	if (user == null) {
		throw new GetterError('noSuchUser');
	}

	return user;
}

/**
 * Get remote user for API processing
 */
export async function getRemoteUser(userId: mongo.ObjectID) {
	const user = await getUser(userId);

	if (!isRemoteUser(user)) {
		throw 'user is not a remote user';
	}

	return user;
}

/**
 * Get local user for API processing
 */
export async function getLocalUser(userId: mongo.ObjectID) {
	const user = await getUser(userId);

	if (!isLocalUser(user)) {
		throw 'user is not a local user';
	}

	return user;
}
