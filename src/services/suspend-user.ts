import renderDelete from '../remote/activitypub/renderer/delete';
import { renderActivity } from '../remote/activitypub/renderer';
import { deliver } from '../queue';
import config from '../config';
import User, { IUser, isLocalUser } from '../models/user';
import Following from '../models/following';
import deleteFollowing from '../services/following/delete';
import rejectFollowing from '../services/following/requests/reject';
import FollowRequest from '../models/follow-request';
import Notification from '../models/notification';
import NoteReaction from '../models/note-reaction';
import UserList from '../models/user-list';
import Blocking from '../models/blocking';
import Mute from '../models/mute';

export async function doPostSuspend(user: IUser, isDelete = false) {
	await unFollowAll(user).catch(() => {});
	await rejectFollowAll(user).catch(() => {});
	await removeFollowingRequestAll(user).catch(() => {});
	await removeFollowedRequestAll(user).catch(() => {});
	await sendDeleteActivity(user).catch(() => {});

	// Delete block/mute
	if (isDelete) {
		await Blocking.remove({ blockerId: user._id }).catch(() => {});
		await Blocking.remove({ blockeeId: user._id }).catch(() => {});
		await Mute.remove({ muterId: user._id }).catch(() => {});
		await Mute.remove({ muteeId: user._id }).catch(() => {});
	}

	// アカウント削除時に送受信したNotificationを削除するように
	await Notification.remove({
		notifieeId: user._id
	}).catch(() => {});

	await Notification.remove({
		notifierId: user._id
	}).catch(() => {});

	await NoteReaction.remove({
		userId: user._id
	}).catch(() => {});

	// 入れられたリストから削除
	await UserList.update({ userIds: user._id }, {
		$pull: {
			userIds: user._id
		}
	}).catch(() => {});
}

export async function sendDeleteActivity(user: IUser) {
	if (isLocalUser(user)) {
		// 知り得る全SharedInboxにDelete配信
		const content = renderActivity(renderDelete(`${config.url}/users/${user._id}`, user));

		const results = await Following.aggregate([
			{
				$match: {
					$or: [
						{ '_follower.sharedInbox': { $ne: null } },
						{ '_followee.sharedInbox': { $ne: null } }
					]
				}
			},
			{
				$project: {
					sharedInbox: {
						$setUnion: [['$_follower.sharedInbox'], ['$_followee.sharedInbox']]
					}
				}
			},
			{
				$unwind: '$sharedInbox'
			},
			{
				$match: {
					sharedInbox: { $ne: null }
				}
			},
			{
				$group: {
					_id: '$sharedInbox',
				}
			}
		]) as { _id: string }[];

		const inboxes = results.map(x => x._id);

		for (const inbox of inboxes) {
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
