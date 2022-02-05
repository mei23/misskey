import User, { IUser } from '../models/user';
import DriveFile from '../models/drive-file';
import { deleteUnusedFile } from '../services/drive/delete-unused-file';

async function main() {
	// remote users
	const users = await User.find({
		host: { $ne: null },
	}, {
		fields: {
			_id: true
		}
	});

	let prs = 0;

	for (const u of users) {
		prs++;

		const user = await User.findOne({
			_id: u._id
		}) as IUser;

		console.log(`user(${prs}/${users.length}): ${user.username}@${user.host}`);

		const files = await DriveFile.find({
			deletedAt: { $exists: false },
			'metadata.userId': user._id,
			'metadata.attachedNoteIds.0': { $exists: false }
		});

		for (const file of files) {
			await deleteUnusedFile(file._id, true);	// TODO: なんか効率悪い
		}
	}
}

main().then(() => {
	console.log('Done');
	setTimeout(() => {
		process.exit(0);
	}, 30 * 1000);
});
