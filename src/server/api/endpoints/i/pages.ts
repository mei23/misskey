import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import define from '../../define';
import Page, { packPageMany } from '../../../../models/page';

export const meta = {
	desc: {
		'ja-JP': '自分の作成したページ一覧を取得します。',
		'en-US': 'Get my pages.'
	},

	tags: ['account', 'pages'],

	requireCredential: true,

	kind: ['read:pages', 'read:account', 'account-read', 'account/read'],

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		sinceId: {
			validator: $.optional.type(ID),
			transform: transform,
		},

		untilId: {
			validator: $.optional.type(ID),
			transform: transform,
		},
	}
};

export default define(meta, async (ps, user) => {
	const query = {
		userId: user._id
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

	const pages = await Page
		.find(query, {
			limit: ps.limit,
			sort: sort
		});

	return await packPageMany(pages, user._id);
});
