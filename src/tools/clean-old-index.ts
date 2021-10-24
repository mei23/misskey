// 90日より古い検索などのインデックスを削除する
import User, { IUser } from '../models/user';
import Note from '../models/note';
import { genMeid7 } from '../misc/id/meid7';
import { ObjectID } from 'mongodb';

async function main(days = 90) {
	const limit = new Date(Date.now() - (days * 1000 * 86400));
	const id = new ObjectID(genMeid7(limit));

	const limit2 = new Date(Date.now() - (1 * 1000 * 86400));
	const id2 = new ObjectID(genMeid7(limit2));

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

		const result = await Note.update({
			$and: [
				{ userId: user._id },
				{ _id: { $lt: id } },
				{ mecabWords: { $ne: null } },
			],
		}, {
			$set: {
				mecabWords: undefined,
			}
		}, {
			multi: true
		});

		console.log(`  clear count mecab:${result.n}`);

		const result2 = await Note.update({
			$and: [
				{ userId: user._id },
				{ _id: { $lt: id2 } },
				{ trendWords: { $exists: null } },
			],
		}, {
			$set: {
				trendWords: undefined,
			}
		}, {
			multi: true
		});

		console.log(`  clear count trend:${result2.n}`);
	}
}

const args = process.argv.slice(2);

main(args[0] ? Number(args[0]) : undefined).then(() => {
	console.log('Done');
	setTimeout(() => {
		process.exit(0);
	}, 30 * 1000);
});
