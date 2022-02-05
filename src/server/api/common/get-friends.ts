import * as mongodb from 'mongodb';
import Following from '../../../models/following';
import User from '../../../models/user';

export const getFriendIds = async (me: mongodb.ObjectID, includeMe = true, activeDays = -1) => {
	// Fetch relation to other users who the I follows
	// SELECT followee
	const followings = await Following
		.find({
			followerId: me
		}, {
			fields: {
				followeeId: true
			}
		});

	// ID list of other users who the I follows
	let myfollowingIds = followings.map(following => following.followeeId);

	if (activeDays > 0) {
		const us = await User.find({
			_id: { $in: myfollowingIds },
			updatedAt: { $gt: new Date(Date.now() - activeDays * 1000 * 86400) },
		}, {
			fields: {
				_id: true
			}
		});

		myfollowingIds = us.map(u => u._id);
	}

	if (includeMe) {
		myfollowingIds.push(me);
	}

	return myfollowingIds;
};

export const getFriends = async (me: mongodb.ObjectID, includeMe = true, remoteOnly = false) => {
	const q: any = remoteOnly ? {
		followerId: me,
		'_followee.host': { $ne: null }
	} : {
		followerId: me
	};
	// Fetch relation to other users who the I follows
	const followings = await Following
		.find(q);

	// ID list of other users who the I follows
	const myfollowings = followings.map(following => ({
		id: following.followeeId
	}));

	if (includeMe) {
		myfollowings.push({
			id: me
		});
	}

	return myfollowings;
};
