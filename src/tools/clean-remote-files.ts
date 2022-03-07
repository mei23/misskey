import DriveFile from '../models/drive-file';
import User from '../models/user';
import delFile from '../services/drive/delete-file';

async function main() {
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
		});

		if (user == null) continue;

		console.log(`user(${prs}/${users.length}): ${user.username}@${user.host}`);

		const files = await DriveFile.find({
			//_id: { $nin: [user.avatarId, user.bannerId] },
			'metadata.userId': user._id,
			'metadata.deletedAt': { $exists: false },
			'metadata.isRemote': { $ne: true },
		});

		for (const file of files) {
			console.log(`expire file: ${file._id} ${file.metadata?.url}`);
			await delFile(file, true);
		}
	}
}

main().then(() => {
	console.log('Done');
});
