import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import * as ms from 'ms';
import { pack } from '../../../../models/user';
import Following from '../../../../models/following';
import deleteFollowing from '../../../../services/following/delete';
import define from '../../define';
import { ApiError } from '../../error';
import { getUser } from '../../common/getters';

export const meta = {
	stability: 'stable',

	desc: {
		'ja-JP': '指定したユーザーのフォロワーを解除します。',
		'en-US': 'Remove follower of the user.'
	},

	tags: ['following', 'users'],

	limit: {
		duration: ms('1hour'),
		max: 1000
	},

	requireCredential: true,

	kind: ['write:following', 'following-write'],

	params: {
		userId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		}
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '5b12c78d-2b28-4dca-99d2-f56139b42ff8'
		},

    followerIsYourself: {
			message: 'Follower is yourself.',
			code: 'FOLLOWER_IS_YOURSELF',
			id: '07dc03b9-03da-422d-885b-438313707662'
		},

		notFollowing: {
			message: 'You are not followed by that user.',
			code: 'NOT_FOLLOWING',
			id: '5dbf82f5-c92b-40b1-87d1-6c8c0741fd09'
		},
	}
};

export default define(meta, async (ps, user) => {
	const followee = user;

	// Check if the follower is yourself
	if (user._id.equals(ps.userId)) {
		throw new ApiError(meta.errors.followerIsYourself);
	}

	// Get follower
	const follower = await getUser(ps.userId).catch(e => {
		if (e.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	// Check not following
	const exist = await Following.findOne({
		followerId: follower._id,
		followeeId: followee._id
	});

	if (exist === null) {
		throw new ApiError(meta.errors.notFollowing);
	}

	await deleteFollowing(follower, followee);

	return await pack(followee._id, user);
});
