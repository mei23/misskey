import define from '../define';
import User from '../../../models/user';

export const meta = {
	desc: {
		'ja-JP': 'アクティブユーザー数を取得します',
		'en-US': 'Get active users count.'
	},

	tags: ['meta'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 60,

	params: {
	},

	res: {
		type: 'object',
		properties: {
			local: {
				type: 'number',
				description: 'Local active users count.',
				example: 10
			},
			global: {
				type: 'number',
				description: 'Global active users count.',
				example: 100
			},
		}
	}
};

export default define(meta, async (ps, me) => {
	const dt = new Date(Date.now() - 1000 * 60 * 10);

	const [local, global] = await Promise.all([
		User.count({
			lastActivityAt: { $gt: dt },
			host: null,
		}),
		User.count({
			lastActivityAt: { $gt: dt },
		}),
	]);

	return {
		local,
		global,
	};
});
