import User, { IUser, isRemoteUser, ILocalUser, pack as packUser } from '../../../models/user';
import FollowRequest from '../../../models/follow-request';
import { renderActivity } from '../../../remote/activitypub/renderer';
import renderFollow from '../../../remote/activitypub/renderer/follow';
import renderReject from '../../../remote/activitypub/renderer/reject';
import { deliver } from '../../../queue';
import { publishMainStream } from '../../stream';
import Following from '../../../models/following';
import { decrementFollowing } from '../delete';

export default async function(followee: IUser, follower: IUser) {
	if (isRemoteUser(follower)) {
		const request = await FollowRequest.findOne({
			followeeId: followee._id,
			followerId: follower._id
		});

		const content = renderActivity(renderReject(renderFollow(follower, followee, request.requestId), followee as ILocalUser));
		deliver(followee as ILocalUser, content, follower.inbox);
	}

	const request = await FollowRequest.findOne({
		followeeId: followee._id,
		followerId: follower._id
	});

	if (request) {
		await FollowRequest.remove({
			_id: request._id
		});

		User.update({ _id: followee._id }, {
			$inc: {
				pendingReceivedFollowRequestsCount: -1
			}
		});
	} else {
		const following = await Following.findOne({
			followeeId: followee._id,
			followerId: follower._id
		});

		if (following) {
			await Following.remove({
				_id: following._id
			});
			decrementFollowing(follower, followee);
		}
	}

	packUser(followee, follower, {
		detail: true
	}).then(packed => publishMainStream(follower._id, 'unfollow', packed));
}
