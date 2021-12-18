import User from '../models/user';
import { removeFollowedRequestAll, removeFollowingRequestAll } from '../services/suspend-user';

async function main() {
	const users = await User.find({
		$or: [
			{ isDeleted: true },
			{ isSuspended: true },
		]
	});

	for (const user of users) {
		console.log(`${user._id} ${user.username}@${user.host || '<self>'}`);
		await removeFollowingRequestAll(user);
		await removeFollowedRequestAll(user);
	}
}

main().then(() => {
	console.log('Done');
});
