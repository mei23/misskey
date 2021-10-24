import Note from '../models/note';
import User from '../models/user';
import Meta from '../models/meta';
import NoteReaction from '../models/note-reaction';

export async function RecountStats() {
	const notesCount = await Note.count({
		//deletedAt: { $exists: false },
	});
	console.log(`notesCount: ${notesCount}`)

	const originalNotesCount = await Note.count({
		//deletedAt: { $exists: false },
		'_user.host': null,
	});
	console.log(`originalNotesCount: ${originalNotesCount}`)

	const usersCount = await User.count({
		//isDeleted: { $ne: true },
		//isSuspended: { $ne: true },
	});
	console.log(`usersCount: ${usersCount}`)

	const originalUsersCount = await User.count({
		//isDeleted: { $ne: true },
		//isSuspended: { $ne: true },
		host: null,
	});
	console.log(`originalUsersCount: ${originalUsersCount}`)

	const reactionsCount = await NoteReaction.count({});
	//const originalReactionsCount = await Note.count(...);
	console.log(`reactionsCount: ${reactionsCount}`)

	Meta.update({}, {
		$set: {
			'stats.notesCount': notesCount,
			'stats.originalNotesCount': originalNotesCount,
			'stats.usersCount': usersCount,
			'stats.originalUsersCount': originalUsersCount,
			'stats.reactionsCount': reactionsCount,
		}
	});
}
