import User, { IUser } from '../models/user';
import Note from '../models/note';
import NoteReaction from '../models/note-reaction';

async function main() {
	// remote users
	const users = await User.find({
		host: { $ne: null },
		isDeleted: true,
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

		const notes = await Note.count({
			userId: user._id
		});

		const reactions = await NoteReaction.count({
			userId: user._id
		});

		console.log(`${notes} ${reactions}`);

		/*
		const res = await User.remove({
			_id: u._id
		});
		*/
		//console.log(`  deleted count:${result.deletedCount}`);

		/*
		for (const note of notes) {
			//console.log(JSON.stringify(note, null, 2));
			console.log(`${note._id}`);
		}
		*/
	}
}

const args = process.argv.slice(2);

main().then(() => {
	console.log('Done');
	setTimeout(() => {
		process.exit(0);
	}, 30 * 1000);
});
