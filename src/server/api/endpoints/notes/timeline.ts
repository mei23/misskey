import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import { getFriendIds } from '../../common/get-friends';
import define from '../../define';
import { getHideUserIds } from '../../common/get-hide-users';
import UserList from '../../../../models/user-list';
import { concat } from '../../../../prelude/array';
import { isSelfHost } from '../../../../misc/convert-host';
import { getHideRenoteUserIds } from '../../common/get-hide-renote-users';
import { oidIncludes } from '../../../../prelude/oid';
import { getPackedTimeline } from '../../common/get-timeline';

export const meta = {
	desc: {
		'ja-JP': 'タイムラインを取得します。',
		'en-US': 'Get timeline of myself.'
	},

	tags: ['notes'],

	requireCredential: true,

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10,
			desc: {
				'ja-JP': '最大数'
			}
		},

		sinceId: {
			validator: $.optional.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '指定すると、この投稿を基点としてより新しい投稿を取得します'
			}
		},

		untilId: {
			validator: $.optional.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '指定すると、この投稿を基点としてより古い投稿を取得します'
			}
		},

		sinceDate: {
			validator: $.optional.num,
			desc: {
				'ja-JP': '指定した時間を基点としてより新しい投稿を取得します。数値は、1970年1月1日 00:00:00 UTC から指定した日時までの経過時間をミリ秒単位で表します。'
			}
		},

		untilDate: {
			validator: $.optional.num,
			desc: {
				'ja-JP': '指定した時間を基点としてより古い投稿を取得します。数値は、1970年1月1日 00:00:00 UTC から指定した日時までの経過時間をミリ秒単位で表します。'
			}
		},

		includeMyRenotes: {
			validator: $.optional.bool,
			default: true,
			desc: {
				'ja-JP': '自分の行ったRenoteを含めるかどうか'
			}
		},

		includeRenotedMyNotes: {
			validator: $.optional.bool,
			default: true,
			desc: {
				'ja-JP': 'Renoteされた自分の投稿を含めるかどうか'
			}
		},

		includeLocalRenotes: {
			validator: $.optional.bool,
			default: true,
			desc: {
				'ja-JP': 'Renoteされたローカルの投稿を含めるかどうか'
			}
		},

		excludeForeignReply: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'フォロー外リプライを含めない'
			}
		},

		excludeRenote: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'Renoteを含めない'
			}
		},

		withFiles: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'true にすると、ファイルが添付された投稿だけ取得します'
			}
		},

		fileType: {
			validator: $.optional.arr($.str),
			desc: {
				'ja-JP': '指定された種類のファイルが添付された投稿のみを取得します'
			}
		},

		excludeNsfw: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'true にすると、NSFW指定されたファイルを除外します(fileTypeが指定されている場合のみ有効)'
			}
		},

		excludeSfw: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'true にすると、NSFW指定されてないファイルを除外します(fileTypeが指定されている場合のみ有効)'
			}
		},

		mediaOnly: {
			validator: $.optional.bool,
			deprecated: true,
			desc: {
				'ja-JP': 'true にすると、ファイルが添付された投稿だけ取得します (このパラメータは廃止予定です。代わりに withFiles を使ってください。)'
			}
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'Note',
		},
	},
};

export default define(meta, async (ps, user) => {
	const [followingIds, hideUserIds, hideFromHomeLists, hideRenoteUserIds] = await Promise.all([
		// フォローを取得
		// Fetch following
		getFriendIds(user._id),

		// 隠すユーザーを取得
		getHideUserIds(user, false),

		// Homeから隠すリストを取得
		UserList.find({
			userId: user._id,
			hideFromHome: true,
		}),

		// リノートを隠すユーザーを取得
		getHideRenoteUserIds(user),
	]);

	const hideFromHomeUsers = concat(hideFromHomeLists.map(list => list.userIds));
	const hideFromHomeHosts = concat<string>(hideFromHomeLists.map(list => list.hosts || [])).map(x => isSelfHost(x) ? null : x);

	//#region Construct query
	const sort = {
		_id: -1
	};

	// どうせフィルタされるユーザーはフォローしてない扱いにして最初のuserのIXSCANの精度を少しでも高くする
	const realFollowingIds = followingIds
		.filter(x => !oidIncludes(hideUserIds, x))
		.filter(x => !oidIncludes(hideFromHomeUsers, x));

	const followQuery = [{
		userId: { $in: realFollowingIds }
	}];

	const visibleQuery = user == null ? [{
		visibility: { $in: [ 'public', 'home' ] }
	}] : [{
		visibility: { $in: [ 'public', 'home', 'followers' ] }
	}, {
		// myself (for specified/private)
		userId: user._id
	}, {
		// to me (for specified)
		visibleUserIds: { $in: [ user._id ] }
	}];

	const query = {
		$and: [{
			deletedAt: null,

			$and: [{
				// フォローしている人の投稿
				$or: followQuery
			}, {
				// visible for me
				$or: visibleQuery
			}],

			// mute
			userId: {
				$nin: hideUserIds.concat(hideFromHomeUsers)
			},
			'_reply.userId': {
				$nin: hideUserIds
			},
			'_renote.userId': {
				$nin: hideUserIds
			},

			'_user.host': {
				$nin: hideFromHomeHosts
			},
		}]
	} as any;

	// MongoDBではトップレベルで否定ができないため、De Morganの法則を利用してクエリします。
	// つまり、「『自分の投稿かつRenote』ではない」を「『自分の投稿ではない』または『Renoteではない』」と表現します。
	// for details: https://en.wikipedia.org/wiki/De_Morgan%27s_laws

	if (ps.excludeForeignReply) {
		query.$and.push({
			$or: [{
				'_reply.userId': null
			}, {
				'_reply.userId': { $in : concat([followingIds, [user._id]]) }
			}, {
				userId: user._id
			}]
		});
	}

	if (ps.excludeRenote) {
		query.$and.push({
			$or: [{
				renoteId: null
			}, {
				text: { $ne: null }
			}, {
				fileIds: { $ne: [] }
			}, {
				poll: { $ne: null }
			}]
		});
	} else {
		if (hideRenoteUserIds.length > 0) {
			query.$and.push({
				$or: [{
					userId: { $nin: hideRenoteUserIds }
				}, {
					renoteId: null
				}, {
					text: { $ne: null }
				}, {
					fileIds: { $ne: [] }
				}, {
					poll: { $ne: null }
				}]
			});
		}

		if (ps.includeMyRenotes === false) {
			query.$and.push({
				$or: [{
					userId: { $ne: user._id }
				}, {
					renoteId: null
				}, {
					text: { $ne: null }
				}, {
					fileIds: { $ne: [] }
				}, {
					poll: { $ne: null }
				}]
			});
		}

		if (ps.includeRenotedMyNotes === false) {
			query.$and.push({
				$or: [{
					'_renote.userId': { $ne: user._id }
				}, {
					renoteId: null
				}, {
					text: { $ne: null }
				}, {
					fileIds: { $ne: [] }
				}, {
					poll: { $ne: null }
				}]
			});
		}

		if (ps.includeLocalRenotes === false) {
			query.$and.push({
				$or: [{
					'_renote.user.host': { $ne: null }
				}, {
					renoteId: null
				}, {
					text: { $ne: null }
				}, {
					fileIds: { $ne: [] }
				}, {
					poll: { $ne: null }
				}]
			});
		}
	}

	const withFiles = ps.withFiles != null ? ps.withFiles : ps.mediaOnly;

	if (withFiles) {
		query.$and.push({
			fileIds: { $exists: true, $ne: [] }
		});
	}

	if (ps.fileType) {
		query.fileIds = { $exists: true, $ne: [] };

		query['_files.contentType'] = {
			$in: ps.fileType
		};

		if (ps.excludeNsfw) {
			query['_files.metadata.isSensitive'] = {
				$ne: true
			};
			query['cw'] = null;
		}

		if (ps.excludeSfw) {
			query['_files.metadata.isSensitive'] = true;
		}
	}

	if (ps.sinceId) {
		sort._id = 1;
		query._id = {
			$gt: ps.sinceId
		};
	} else if (ps.untilId) {
		query._id = {
			$lt: ps.untilId
		};
	} else if (ps.sinceDate) {
		sort._id = 1;
		query.createdAt = {
			$gt: new Date(ps.sinceDate)
		};
	} else if (ps.untilDate) {
		query.createdAt = {
			$lt: new Date(ps.untilDate)
		};
	}
	//#endregion

	return await getPackedTimeline(user, query, sort, ps.limit!);
});
