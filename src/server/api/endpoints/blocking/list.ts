import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import Blocking, { packMany } from '../../../../models/blocking';
import define from '../../define';
import User from '../../../../models/user';

export const meta = {
	desc: {
		'ja-JP': 'ブロックしているユーザー一覧を取得します。',
		'en-US': 'Get blocking users.'
	},

	tags: ['account'],

	requireCredential: true,

	kind: ['read:blocks', 'read:following', 'following-read'],

	params: {
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

	res: {
		type: 'array',
		items: {
			type: 'Blocking',
		}
	},
};

export default define(meta, async (ps, me) => {
	const suspended = await User.find({
		isSuspended: true
	}, {
		fields: {
			_id: true
		}
	});

	const query = {
		blockerId: me._id,
		blockeeId: { $nin: suspended.map(x => x._id) }
	} as any;

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

	const blockings = await Blocking
		.find(query, {
			limit: ps.limit,
			sort: sort
		});

	return await packMany(blockings, me);
});
