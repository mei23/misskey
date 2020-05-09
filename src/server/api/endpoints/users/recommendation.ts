import $ from 'cafy';
import { pack, ILocalUser, IUser } from '../../../../models/user';
import define from '../../define';
import fetchMeta from '../../../../misc/fetch-meta';
import resolveUser from '../../../../remote/resolve-user';
import { getHideUserIds } from '../../common/get-hide-users';
import { apiLogger } from '../../logger';
import Following from '../../../../models/following';

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

	// 登録直後のユーザーだとタイムアウトしたり人気のユーザーと同じになったりするので空を返す
	if (!(me.notesCount > 10 && me.followingCount > 10)) {
		return [];
	}

	const instance = await fetchMeta();

	if (instance.enableExternalUserRecommendation) {
		throw '廃止';
	} else {
		// 隠すユーザーを取得
		const hideUserIds = await getHideUserIds(me);
		if (me) hideUserIds.push(me._id);

		// 未ログイン or フォールバックは、ローカルユーザーの全フォロワーを対象にする
		let matchQuery = {
			followeeId: { $nin: hideUserIds },
		} as any;

		// ログイン時にローカルフォローがあればそのユーザーのフォローを対象にする
		if (me != null) {
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
			}
		}
		//#endregion

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
			// updatedAtでユーザーフィルタ
			$match: {
				'_user.updatedAt': { $gt: new Date(Date.now() - (1000 * 60 * 60 * 24 * 5)) }
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
	}
});

type IRecommendUser = {
	name: string;
	username: string;
	host: string;
	description: string;
	avatarUrl: string;
};

/**
 * Resolve/Pack dummy users
 */
async function convertUsers(src: IRecommendUser[], me: ILocalUser) {
	const packed = await Promise.all(src.map(async x => {
		const user = await resolveUser(x.username, x.host)
			.catch(() => {
				apiLogger.warn(`Can't resolve ${x.username}@${x.host}`);
				return null;
			});

		if (user == null) return x;

		return await pack(user, me, { detail: true });
	}));

	return packed;
}
