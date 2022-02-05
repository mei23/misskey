// なぜか残っている削除ユーザーのオブジェクトを物理削除する
import User, { IUser } from '../models/user';
import Notification from '../models/notification';
import FollowRequest from '../models/follow-request';
import Following from '../models/following';
import NoteReaction from '../models/note-reaction';

async function main() {
	const users = await User.find({
		$or: [
			{ isDeleted: true },
			{ isSuspended: true },
		],
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

		const receivedNotification = await Notification.remove({
			notifieeId: user._id
		});
		console.log(`  receivedNotification:${receivedNotification.deletedCount}`);

		const sendNotification = await Notification.remove({
			notifierId: user._id
		});
		console.log(`  sendNotification:${sendNotification.deletedCount}`);

		const receivedFollowRequest = await FollowRequest.remove({
			followeeId: user._id
		});
		console.log(`  receivedFollowRequest:${receivedFollowRequest.deletedCount}`);

		const sendFollowRequest = await FollowRequest.remove({
			followerId: user._id
		});
		console.log(`  sendFollowRequest:${sendFollowRequest.deletedCount}`);

		const followed = await Following.remove({
			followeeId: user._id
		});
		console.log(`  follows:${followed.deletedCount}`);

		const follows = await Following.remove({
			followerId: user._id
		});
		console.log(`  follows:${follows.deletedCount}`);

		const reactions = await NoteReaction.remove({
			userId: user._id
		});

		console.log(`  reactions:${reactions.deletedCount}`);

	}
}

main().then(() => {
	console.log('Done');
	setTimeout(() => {
		process.exit(0);
	}, 30 * 1000);
});
