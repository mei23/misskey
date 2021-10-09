import renderDelete from '../remote/activitypub/renderer/delete';
import { renderActivity } from '../remote/activitypub/renderer';
import { deliver } from '../queue';
import config from '../config';
import User, { IUser, isLocalUser } from '../models/user';
import Following from '../models/following';
import deleteFollowing from '../services/following/delete';
import rejectFollowing from '../services/following/requests/reject';
import FollowRequest from '../models/follow-request';

export async function doPostSuspend(user: IUser) {
	await unFollowAll(user).catch(() => {});
	await rejectFollowAll(user).catch(() => {});
	await removeFollowingRequestAll(user).catch(() => {});
	await removeFollowedRequestAll(user).catch(() => {});
	await sendDeleteActivity(user).catch(() => {});
}

export async function sendDeleteActivity(user: IUser) {
	if (isLocalUser(user)) {
		// 知り得る全SharedInboxにDelete配信
		const content = renderActivity(renderDelete(`${config.url}/users/${user._id}`, user));

		const queue: string[] = [];

		const followings = await Following.find({
			$or: [
				{ '_follower.sharedInbox': { $ne: null } },
				{ '_followee.sharedInbox': { $ne: null } },
			]
		}, {
			'_follower.sharedInbox': 1,
			'_followee.sharedInbox': 1,
		});

		const inboxes = followings.map(x => x._follower.sharedInbox || x._followee.sharedInbox);

		for (const inbox of inboxes) {
			if (inbox != null && !queue.includes(inbox)) queue.push(inbox);
		}

		for (const inbox of queue) {
			deliver(user as any, content, inbox);
		}
	}
}

async function unFollowAll(follower: IUser) {
	const followings = await Following.find({
		followerId: follower._id
	});

	for (const following of followings) {
		const followee = await User.findOne({
			_id: following.followeeId
		});

		if (followee == null) {
			continue;
		}

		await deleteFollowing(follower, followee, true);
	}
}

async function rejectFollowAll(followee: IUser) {
	const followings = await Following.find({
		followeeId: followee._id
	});

	for (const following of followings) {
		const follower = await User.findOne({
			_id: following.followerId
		});

		if (follower == null) {
			continue;
		}

		await rejectFollowing(followee, follower);
	}
}

export async function removeFollowingRequestAll(follower: IUser) {
	const reqs = await FollowRequest.find({
		followerId: follower._id
	});

	for (const req of reqs) {
		await FollowRequest.remove({ _id: req._id });

		const followee = await User.findOne({
			_id: req.followeeId
		});

		if (followee == null) {
			continue;
		}

		await User.update({ _id: followee._id }, {
			$inc: {
				pendingReceivedFollowRequestsCount: -1
			}
		});
	}
}

export async function removeFollowedRequestAll(followee: IUser) {
	const reqs = await FollowRequest.find({
		followeeId: followee._id
	});

	for (const req of reqs) {
		await FollowRequest.remove({ _id: req._id });
	}
}
