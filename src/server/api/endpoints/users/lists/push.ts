import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import UserList from '../../../../../models/user-list';
import define from '../../../define';
import { ApiError } from '../../../error';
import { GetterError, getUser } from '../../../common/getters';
import { pushUserToUserList } from '../../../../../services/user-list/push';
import { oidIncludes } from '../../../../../prelude/oid';
import { publishFilterChanged } from '../../../../../services/server-event';

export const meta = {
	desc: {
		'ja-JP': '指定したユーザーリストに指定したユーザーを追加します。',
		'en-US': 'Add a user to a user list.'
	},

	tags: ['lists', 'users'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
		listId: {
			validator: $.type(ID),
			transform: transform,
		},

		userId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},
	},

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: '2214501d-ac96-4049-b717-91e42272a711'
		},

		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: 'a89abd3d-f0bc-4cce-beb1-2f446f4f1e6a'
		},

		alreadyAdded: {
			message: 'That user has already been added to that list.',
			code: 'ALREADY_ADDED',
			id: '1de7c884-1595-49e9-857e-61f12f4d4fc5'
		}
	}
};

export default define(meta, async (ps, me) => {
	// Fetch the list
	const userList = await UserList.findOne({
		_id: ps.listId,
		userId: me._id,
	});

	if (userList == null) {
		throw new ApiError(meta.errors.noSuchList);
	}

	// Fetch the user
	const user = await getUser(ps.userId).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchUser') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	if (oidIncludes(userList.userIds, user._id)) {
		throw new ApiError(meta.errors.alreadyAdded);
	}

	// Push the user
	pushUserToUserList(user, userList);

	publishFilterChanged(me._id);
});
