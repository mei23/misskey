import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import acceptFollowRequest from '../../../../../services/following/requests/accept';
import define from '../../../define';
import { ApiError } from '../../../error';
import { GetterError, getUser } from '../../../common/getters';
import { FollowingError } from '../../../../../services/following/following-error';

export const meta = {
	desc: {
		'ja-JP': '自分に届いた、指定したフォローリクエストを承認します。',
		'en-US': 'Accept a follow request.'
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
			id: '66ce1645-d66c-46bb-8b79-96739af885bd'
		},
		noFollowRequest: {
			message: 'No follow request.',
			code: 'NO_FOLLOW_REQUEST',
			id: 'bcde4f8b-0913-4614-8881-614e522fb041'
		},
	}
};

export default define(meta, async (ps, user) => {
	// Fetch follower
	const follower = await getUser(ps.userId).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchUser') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	await acceptFollowRequest(user, follower).catch(e => {
		if (e instanceof FollowingError && e.type === 'noFollowRequest') throw new ApiError(meta.errors.noFollowRequest);
		throw e;
	});

	return;
});
