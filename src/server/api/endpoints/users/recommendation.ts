import $ from 'cafy';
import { pack, IUser } from '../../../../models/user';
import define from '../../define';
import { getHideUserIds } from '../../common/get-hide-users';
import Following from '../../../../models/following';

const nonnull = { $ne: null as any };

export const meta = {
	desc: {
		'ja-JP': 'おすすめのユーザー一覧を取得します。'
	},

	tags: ['users'],

	requireCredential: false,

	kind: ['read:account', 'account-read', 'account/read'],

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		offset: {
			validator: $.optional.num.min(0),
			default: 0
		},

		origin: {
			validator: $.optional.str.or([
				'combined',
				'local',
				'remote',
			]),
			default: 'combined'
		}
	},

	res: {
		type: 'array',
		items: {
			type: 'User',
		}
	},
};

export default define(meta, async (ps, me) => {
	// 未ログインはエラーにはしないが空を返す
	if (me == null) {
		return [];
	}

	// 隠すユーザーを取得
	const hideUserIds = await getHideUserIds(me);
	if (me) hideUserIds.push(me._id);

	// 未ログイン or フォールバックは、ローカルユーザーの全フォロワーを対象にする
	let matchQuery = {
		followeeId: { $nin: hideUserIds },
	} as any;

	// ローカルフォローがあればそのユーザーのフォローを対象にする
	const myFollowings = await Following.find({
		followerId: me._id
	});

	const followingIds = myFollowings.map(f => f.followeeId);
	const localIds = myFollowings.filter(f => f._followee.host == null).map(f => f.followeeId);

	if (localIds.length > 0) {
		matchQuery = {
			followerId: { $in: localIds },
			followeeId: { $nin: followingIds.concat(hideUserIds) },
		};

		if (ps.origin === 'local') matchQuery['_followee.host'] = null;
		if (ps.origin === 'remote') matchQuery['_followee.host'] = nonnull;
	}

	const followings = await Following.aggregate([{
		$match: matchQuery
	}, {
		// フォロワー数でグルーピング
		$group: {
			_id: '$followeeId',
			count: { $sum: 1 }
		}
	}, {
		// join User
		$lookup: {
			from: 'users',
			localField: '_id',
			foreignField: '_id',
			as: '_user',
		}
	}, {
		$unwind: '$_user'
	}, {
		// ユーザーフィルタ
		$match: {
			'_user.updatedAt': { $gt: new Date(Date.now() - (1000 * 60 * 60 * 24 * 5)) },
			'_user.isExplorable': true,
			'_user.isLocked': { $ne: true },
		}
	}, {
		// フォロワー多い順
		$sort: {
			count: -1
		}
	}, {
		$skip: ps.offset
	}, {
		$limit: ps.limit
	}]) as any[];

	const users = followings.map(x => x._user) as IUser[];

	return await Promise.all(users.map(user => pack(user, me, { detail: true })));
});
