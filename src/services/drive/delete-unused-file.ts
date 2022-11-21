import DriveFile from '../../models/drive-file';
import { ObjectID } from 'mongodb';
import User, { isRemoteUser } from '../../models/user';
import deleteFile from './delete-file';
import { oidEquals } from '../../prelude/oid';

export async function deleteUnusedFile(fileId: ObjectID, detail = false) {
	const file = await DriveFile.findOne(fileId);
	if (!file?.metadata?.userId) {
		return;
	}

	const user = await User.findOne(file.metadata.userId)
	if (!isRemoteUser(user)) {
		if (detail) console.log(`  ${file._id} not a remote user`);
		return;
	}

	if (oidEquals(file._id, user.avatarId) || oidEquals(file._id, user.bannerId)) {
		if (detail) console.log(`  ${file._id} avatar or banner attached`);
		return;
	}

	if (!file.metadata.attachedNoteIds || file.metadata.attachedNoteIds.length !== 0) {
		if (detail) console.log(`  ${file._id} note attached`);
		return;
	}

	if (!file.metadata.attachedMessageIds || file.metadata.attachedMessageIds.length !== 0) {
		if (detail) console.log(`  ${file._id} message attached`);
		return;
	}

	if (detail) console.log(`  ${file._id} delete`);
	await deleteFile(file);
}
