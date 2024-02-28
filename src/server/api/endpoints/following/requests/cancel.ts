import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import cancelFollowRequest from '../../../../../services/following/requests/cancel';
import { pack } from '../../../../../models/user';
import define from '../../../define';
import { ApiError } from '../../../error';
import { GetterError, getUser } from '../../../common/getters';
import { FollowingError } from '../../../../../services/following/following-error';

export const meta = {
	desc: {
		'ja-JP': '自分が作成した、指定したフォローリクエストをキャンセルします。',
		'en-US': 'Cancel a follow request.'
	},

	tags: ['following', 'account'],

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
			id: '4e68c551-fc4c-4e46-bb41-7d4a37bf9dab'
		},

		followRequestNotFound: {
			message: 'Follow request not found.',
			code: 'FOLLOW_REQUEST_NOT_FOUND',
			id: '089b125b-d338-482a-9a09-e2622ac9f8d4'
		},
	}
};

export default define(meta, async (ps, user) => {
	// Fetch followee
	const followee = await getUser(ps.userId).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchUser') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	try {
		await cancelFollowRequest(followee, user);
	} catch (e) {
		if (e instanceof FollowingError) {
			if (e.type === 'followRequestNotFound') throw new ApiError(meta.errors.followRequestNotFound);
		}
		throw e;
	}

	return await pack(followee._id, user);
});
