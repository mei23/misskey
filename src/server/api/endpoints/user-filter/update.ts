import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import define from '../../define';
import { ApiError } from '../../error';
import { getUser } from '../../common/getters';
import UserFilter from '../../../../models/user-filter';

export const meta = {
	desc: {
		'ja-JP': 'ユーザーをミュートします。',
		'en-US': 'Mute a user'
	},

	tags: ['user-filter', 'users'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
		targetId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},

		hideRenote: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'hideRenote'
			}
		},
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '16615490-b8a7-4c36-b948-698c47d9f1da'
		},

		targetIsYourself: {
			message: 'Target is yourself.',
			code: 'TARGET_IS_YOURSELF',
			id: '5396c49d-66b0-4f4a-8451-7e56472a5129'
		},
	}
};

export default define(meta, async (ps, me) => {
	// reject myself
	if (me._id.equals(ps.targetId)) {
		throw new ApiError(meta.errors.targetIsYourself);
	}

	// get target
	const target = await getUser(ps.targetId).catch(e => {
		if (e.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	const updates = {} as {
		hideRenote?: boolean;
	};

	if (ps.hideRenote !== undefined) updates.hideRenote = ps.hideRenote;

	const key = {
		ownerId: me._id,
		targetId: target._id
	};

	const exist = await UserFilter.findOne(key);

	if (exist) {
		await UserFilter.update(key, { $set: updates });
	} else {
		await UserFilter.insert(Object.assign(key, updates));
	}

	return;
});
