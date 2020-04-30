import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import UserFilter, { packUserFilterMany } from '../../../../models/user-filter';
import define from '../../define';

export const meta = {
	desc: {
		'ja-JP': 'ユーザーフィルター一覧を取得します。',
		'en-US': 'Get user filters'
	},

	tags: ['user-filter', 'account'],

	requireCredential: true,

	kind: ['read:account', 'account-read', 'account/read'],

	params: {
		type: {
			validator: $.optional.str.or(['hideRenote']),
			desc: {
				'ja-JP': '種類'
			}
		},

		limit: {
			validator: $.optional.num.range(1, 100),
			default: 30
		},

		sinceId: {
			validator: $.optional.type(ID),
			transform: transform,
		},

		untilId: {
			validator: $.optional.type(ID),
			transform: transform,
		},
	},
};

export default define(meta, async (ps, me) => {
	/*
	const suspended = await User.find({
		isSuspended: true
	}, {
		fields: {
			_id: true
		}
	});
	*/

	const query = {
		ownerId: me._id,
		//targetId: { $nin: suspended.map(x => x._id) }
	} as any;

	if (ps.type === 'hideRenote') {
		query.hideRenote = true;
	}

	const sort = {
		_id: -1
	};

	if (ps.sinceId) {
		sort._id = 1;
		query._id = {
			$gt: ps.sinceId
		};
	} else if (ps.untilId) {
		query._id = {
			$lt: ps.untilId
		};
	}

	const filters = await UserFilter
		.find(query, {
			limit: ps.limit,
			sort: sort
		});

	return await packUserFilterMany(filters, me);
});
