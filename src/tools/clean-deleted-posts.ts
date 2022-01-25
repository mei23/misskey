// 90日以内の削除済みリモート投稿を物理削除する
import User, { IUser } from '../models/user';
import Note from '../models/note';
import { genMeid7 } from '../misc/id/meid7';
import { ObjectID } from 'mongodb';

async function main(days = 90) {
	const limit = new Date(Date.now() - (days * 1000 * 86400));
	const id = new ObjectID(genMeid7(limit));

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

		const result = await Note.remove({
			$and: [
				{
					userId: user._id
				},
				{
					_id: { $lt: id }
				},
				{
					deletedAt: { $exists: true }
				},
			],
		});

		console.log(`  deleted count:${result.deletedCount}`);
	}
}

const args = process.argv.slice(2);

main(args[0]).then(() => {
	console.log('Done');
	setTimeout(() => {
		process.exit(0);
	}, 30 * 1000);
});
