import UserList, { pack } from '../../../../../models/user-list';
import define from '../../../define';
import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';

export const meta = {
	desc: {
		'ja-JP': '自分の作成したユーザーリスト一覧を取得します。'
	},

	tags: ['lists', 'account'],

	requireCredential: true,

	kind: ['read:account', 'account-read', 'account/read'],

	params: {
		userId: {
			validator: $.optional.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '特定のユーザーを含むリストのみ'
			}
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'UserList',
		},
	},
};

export default define(meta, async (ps, me) => {
	const query = {
		userId: me._id,
	} as any;

	if (ps.userId) {
		query.userIds = ps.userId;
	}

	const userLists = await UserList.find(query);

	return await Promise.all(userLists.map(x => pack(x)));
});
