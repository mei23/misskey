import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import UserList from '../../../../../models/user-list';
import { publishUserListStream } from '../../../../../services/stream';
import define from '../../../define';
import { ApiError } from '../../../error';
import { toDbHost } from '../../../../../misc/convert-host';

export const meta = {
	desc: {
		'ja-JP': '指定したユーザーリストから指定したホストを削除します。',
		'en-US': 'Remove a host to a user list.'
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
			id: '4127a206-ff0b-46dd-ad1c-349e0e753177'
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

	await UserList.update({ _id: userList._id }, {
		$pull: {
			hosts: host
		}
	});

	publishUserListStream(userList._id, 'hostRemoved', host);
});
