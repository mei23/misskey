import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import UserList from '../../../../../models/user-list';
import define from '../../../define';
import { ApiError } from '../../../error';
import { toDbHost } from '../../../../../misc/convert-host';
import { publishUserListStream } from '../../../../../services/stream';

export const meta = {
	desc: {
		'ja-JP': '指定したユーザーリストに指定したホストを追加します。',
		'en-US': 'Add a host to a user list.'
	},

	tags: ['lists', 'users'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
		listId: {
			validator: $.type(ID),
			transform: transform,
		},

		host: {
			validator: $.str,
			desc: {
				'ja-JP': '対象のホスト',
				'en-US': 'Target host'
			}
		},
	},

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: ' 429c93f3-6f2d-4189-8636-15de2d8dc355'
		},

		alreadyAdded: {
			message: 'That host has already been added to that list.',
			code: 'ALREADY_ADDED',
			id: '7e2d0f3b-a79d-49c3-9e96-d47be51cdfa3'
		}
	}
};

export default define(meta, async (ps, me) => {
	const userList = await UserList.findOne({
		_id: ps.listId,
		userId: me._id,
	});

	if (userList == null) {
		throw new ApiError(meta.errors.noSuchList);
	}

	const host = toDbHost(ps.host);

	if (userList.hosts && userList.hosts.includes(host)) {
		throw new ApiError(meta.errors.alreadyAdded);
	}

	await UserList.update({ _id: userList._id }, {
		$push: {
			hosts: host
		}
	});

	publishUserListStream(userList._id, 'hostAdded', host);
});
