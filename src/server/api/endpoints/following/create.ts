import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import * as ms from 'ms';
import { pack, isRemoteUser } from '../../../../models/user';
import Following from '../../../../models/following';
import create from '../../../../services/following/create';
import define from '../../define';
import { ApiError } from '../../error';
import { getUser } from '../../common/getters';

export const meta = {
	stability: 'stable',

	desc: {
		'ja-JP': '指定したユーザーをフォローします。',
		'en-US': 'Follow a user.'
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
			id: 'fcd2eef9-a9b2-4c4f-8624-038099e90aa5'
		},

		followeeIsYourself: {
			message: 'Followee is yourself.',
			code: 'FOLLOWEE_IS_YOURSELF',
			id: '26fbe7bb-a331-4857-af17-205b426669a9'
		},

		alreadyFollowing: {
			message: 'You are already following that user.',
			code: 'ALREADY_FOLLOWING',
			id: '35387507-38c7-4cb9-9197-300b93783fa0'
		},

		blocking: {
			message: 'You are blocking that user.',
			code: 'BLOCKING',
			id: '4e2206ec-aa4f-4960-b865-6c23ac38e2d9'
		},

		blocked: {
			message: 'This account cannot be followed.',
			code: 'BLOCKED',
			id: 'c4ab57cc-4e41-45e9-bfd9-584f61e35ce0'
		},

		noFederation: {
			message: 'noFederation.',
			code: 'NO_FEDERATION',
			id: '32850d5a-3269-4ef2-8c5d-f08f71884df6'
		},
	}
};

export default define(meta, async (ps, user) => {
	const follower = user;

	// 自分自身
	if (user._id.equals(ps.userId)) {
		throw new ApiError(meta.errors.followeeIsYourself);
	}

	// Get followee
	const followee = await getUser(ps.userId).catch(e => {
		if (e.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	// no federation
	if (user.noFederation && isRemoteUser(followee)) {
		throw new ApiError(meta.errors.noFederation);
	}

	// Check if already following
	const exist = await Following.findOne({
		followerId: follower._id,
		followeeId: followee._id
	});

	if (exist !== null) {
		throw new ApiError(meta.errors.alreadyFollowing);
	}

	try {
		await create(follower, followee);
	} catch (e) {
		if (e.id === '710e8fb0-b8c3-4922-be49-d5d93d8e6a6e') throw new ApiError(meta.errors.blocking);
		if (e.id === '3338392a-f764-498d-8855-db939dcf8c48') throw new ApiError(meta.errors.blocked);
		throw e;
	}

	return await pack(followee._id, user);
});
