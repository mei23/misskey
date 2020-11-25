import $ from 'cafy';
import * as escapeRegexp from 'escape-regexp';
import User, { pack, IUser } from '../../../../models/user';
import define from '../../define';
import { toDbHost, isSelfHost } from '../../../../misc/convert-host';
import Instance from '../../../../models/instance';
import { concat } from '../../../../prelude/array';
import Usertag from '../../../../models/usertag';

export const meta = {
	desc: {
		'ja-JP': 'ユーザーを検索します。'
	},

	tags: ['users'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 300,

	params: {
		query: {
			validator: $.str,
			desc: {
				'ja-JP': 'クエリ'
			}
		},

		offset: {
			validator: $.optional.either($.optional.num.min(0), $.str.pipe(v => 0 <= Number(v))),
			default: 0,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': 'オフセット'
			}
		},

		limit: {
			validator: $.optional.either($.optional.num.range(1, 100), $.str.pipe(v => 1 <= Number(v) && Number(v) <= 100)),
			default: 10,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': '取得する数'
			}
		},

		localOnly: {
			validator: $.optional.either($.boolean, $.str.or(['true', 'false'])),
			default: false,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': 'ローカルユーザーのみ検索対象にするか否か'
			}
		},

		detail: {
			validator: $.optional.either($.boolean, $.str.or(['true', 'false'])),
			default: true,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': '詳細なユーザー情報を含めるか否か'
			}
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'User',
		}
	},
};

export default define(meta, async (ps, me) => {
	const isName = !ps.query.startsWith('@') || ps.query.replace('@', '').match(/^[\W-]/) != null;
	const isUsername = ps.query.replace('@', '').match(/^\w([\w-]*\w)?$/);
	const isHostname = ps.query.replace('@', '').match(/\./) != null;

	let users: IUser[] = [];

	// 隠すインスタンス
	const hideInstances = await Instance.find({
		$or: [
			{ isMarkedAsClosed: true },
			{ isBlocked: true }
		]
	}, {
		fields: {
			host: true
		}
	});

	// 隠すホスト
	const hideHosts = hideInstances.map(x => toDbHost(x.host));
	const hideHostsForRemote = concat([hideHosts, [null]]);

	// 表示名/ユーザータグ
	if (isName) {
		const name = ps.query.replace(/^-/, '');

		if (me) {
			const usertags = await Usertag.find({
				ownerId: me._id,
				tags: name
			});

			users = await User.find({
				_id: { $in: usertags.map(x => x.targetId ) }
			});
		}

		if (users.length < ps.limit) {
			// local
			const otherUsers = await User
				.find({
					host: null,
					name: new RegExp('^' + escapeRegexp(name), 'i'),
					isSuspended: { $ne: true }
				}, {
					limit: ps.limit,
					skip: ps.offset
				});
			users = users.concat(otherUsers);
		}

		if (users.length < ps.limit && !ps.localOnly) {
			// try remote
			const otherUsers = await User
				.find({
					host: { $nin: hideHostsForRemote },
					name: new RegExp('^' + escapeRegexp(name), 'i'),
					isSuspended: { $ne: true }
				}, {
					limit: ps.limit - users.length
				});

			users = users.concat(otherUsers);
		}
	// ユーザー名
	} else if (isUsername) {
		// まず、username (local/remote) の完全一致でアクティブ順
		if (users.length < ps.limit && !ps.localOnly) {
			users = await User
				.find({
						host: { $nin: hideHosts },
						usernameLower: ps.query.replace('@', '').toLowerCase(),
						isSuspended: { $ne: true }
					}, {
						limit: ps.limit - users.length,
						skip: ps.offset,
						sort: { updatedAt: -1 },
					});
		}

		const ids = users.map(user => user._id);

		// 足りなかったら、username (local) の前方一致でid順
		if (users.length < ps.limit) {
			const otherUsers = await User
				.find({
					_id: { $nin: ids },
					host: null,
					usernameLower: new RegExp('^' + escapeRegexp(ps.query.replace('@', '').toLowerCase())),
					isSuspended: { $ne: true }
				}, {
					limit: ps.limit - users.length,
					skip: ps.offset
				});

				users = users.concat(otherUsers);
		}

		// 足りなかったら、username (remote) の前方一致でid順
		if (users.length < ps.limit && !ps.localOnly) {
			const otherUsers = await User
				.find({
					_id: { $nin: ids },
					host: { $nin: hideHostsForRemote },
					usernameLower: new RegExp('^' + escapeRegexp(ps.query.replace('@', '').toLowerCase())),
					isSuspended: { $ne: true }
				}, {
					limit: ps.limit - users.length,
					skip: ps.offset
				});

			users = users.concat(otherUsers);
		}
	// ホスト名
	} else if (isHostname) {
		users = await User
		.find({
			host: isSelfHost(ps.query) ? null : toDbHost(ps.query.replace('@', '')),
			isSuspended: { $ne: true }
		}, {
			limit: ps.limit - users.length
		});
	}

	return await Promise.all(users.map(user => pack(user, me, { detail: ps.detail })));
});
