import * as mongo from 'mongodb';
import { pack as packUser, IUser, isRemoteUser, fetchProxyAccount, IRemoteUser, ILocalUser } from '../../models/user';
import UserList, { IUserList } from '../../models/user-list';
import { publishUserListStream } from '../stream';
import Following from '../../models/following';
import { fetchOutbox } from '../../remote/activitypub/models/person';
import createFollowing from '../following/create';
import FollowRequest from '../../models/follow-request';

export async function pushUserToUserList(target: IUser, list: IUserList) {
	await UserList.update({ _id: list._id }, {
		$push: {
			userIds: target._id
		}
	});

	publishUserListStream(list._id, 'userAdded', await packUser(target));

	fetchOutbox(target);

	// このインスタンス内にこのリモートユーザーをフォローしているユーザーがいなくても投稿を受け取るためにダミーのユーザーがフォローしたということにする
	if (isRemoteUser(target)) {
		tryProxyFollow(target, list.userId);
	}
}

async function tryProxyFollow(target: IRemoteUser, userId: mongo.ObjectID) {
	// めんどくさそうなアカウントはスキップ
	if (target.isLocked) {
		return;
	}

	// 誰かがフォローしていればスキップ
	const exist = await Following.count({
		followeeId: target._id,
		'_follower.host': null
	}, {
		limit: 1
	});

	if (exist > 0) {
		return;
	}

	// その人がフォロー申請中だったらスキップ
	const req = await FollowRequest.findOne({
		followerId: userId,
		followeeId: target._id
	});

	if (req) {
		return;
	}

	const proxy = await fetchProxyAccount();
	createFollowing(proxy, target);
}
