import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import UserList from '../../../../models/user-list';
import define from '../../define';
import { getFriendIds } from '../../common/get-friends';
import { getHideUserIds } from '../../common/get-hide-users';
import { ApiError } from '../../error';
import { isSelfHost } from '../../../../misc/convert-host';
import { getHideRenoteUserIds } from '../../common/get-hide-renote-users';
import { intersection } from 'lodash';
import { concat } from '../../../../prelude/array';
import { getPackedTimeline } from '../../common/get-timeline';

export const meta = {
	desc: {
		'ja-JP': '指定したユーザーリストのタイムラインを取得します。',
		'en-US': 'Get timeline of a user list.'
	},

	tags: ['notes', 'lists'],

	requireCredential: true,

	params: {
		listId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': 'リストのID'
			}
		},

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

		includeForeignReply: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': '外部リプライを含める'
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

	errors: {
		noSuchList: {
			message: 'No such list.',
			code: 'NO_SUCH_LIST',
			id: '8fb1fbd5-e476-4c37-9fb0-43d55b63a2ff'
		}
	}
};

export default define(meta, async (ps, user) => {
	const [list, followingIds, hideUserIds, hideRenoteUserIds] = await Promise.all([
		// リストを取得
		// Fetch the list
		UserList.findOne({
			_id: ps.listId,
			userId: user._id
		}),

		// フォローを取得
		// Fetch following
		getFriendIds(user._id, true),

		// 隠すユーザーを取得
		getHideUserIds(user, false),

		// リノートを隠すユーザーを取得
		getHideRenoteUserIds(user),
	]);

	if (list == null) {
		throw new ApiError(meta.errors.noSuchList);
	}

	if (list.mediaOnly) {
		const medias = ['image/jpeg', 'image/png', 'image/apng', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'];
		if (ps.fileType?.length) {
			ps.fileType = intersection(ps.fileType, medias);
		} else {
			ps.fileType = medias;
		}
	}

	//#region Construct query
	const sort = {
		_id: -1
	};

	let listQuery = list.userIds.map(u => ({
		userId: u,

		/*// リプライは含めない(ただし投稿者自身の投稿へのリプライ、自分の投稿へのリプライ、自分のリプライは含める)
		$or: [{
			// リプライでない
			replyId: null
		}, { // または
			// リプライだが返信先が投稿者自身の投稿
			$expr: {
				$eq: ['$_reply.userId', '$userId']
			}
		}, { // または
			// リプライだが返信先が自分(フォロワー)の投稿
			'_reply.userId': user._id
		}, { // または
			// 自分(フォロワー)が送信したリプライ
			userId: user._id
		}]*/
	})) as {}[];

	if (list.hosts && list.hosts.length > 0) {
		if (list.hosts.some(x => x === '*')) {
			listQuery = [ {} ];
		} else {
			listQuery.push({
				'_user.host': { $in: list.hosts.map(x => isSelfHost(x) ? null : x) }
			});
		}
	}

	if (listQuery.length == 0) {
		return [];
	}

	const visibleQuery = [{
		visibility: { $in: ['public', 'home'] }
	}, {
		// myself (for specified/private)
		userId: user._id
	}, {
		// to me (for specified)
		visibleUserIds: { $in: [user._id] }
	}, {
		visibility: 'followers',
		userId: { $in: followingIds }
	}];

	const query = {
		$and: [{
			deletedAt: null,

			$and: [{
				// リストに入っている人のタイムラインへの投稿
				$or: listQuery
			}, {
				// visible for me
				$or: visibleQuery
			}],

			// mute
			userId: {
				$nin: hideUserIds
			},
			'_reply.userId': {
				$nin: hideUserIds
			},
			'_renote.userId': {
				$nin: hideUserIds
			},
		}]
	} as any;

	// MongoDBではトップレベルで否定ができないため、De Morganの法則を利用してクエリします。
	// つまり、「『自分の投稿かつRenote』ではない」を「『自分の投稿ではない』または『Renoteではない』」と表現します。
	// for details: https://en.wikipedia.org/wiki/De_Morgan%27s_laws
	if (!ps.includeForeignReply) {
		query.$and.push({
			$or: [{
				replyId: null	// normal post
			}, {
				'_reply.userId': user._id	// to me
			}, {
				userId: user._id	// my post
			}, {
				$expr: { $eq: ['$_reply.userId', '$userId'] }
			}]
		});
	}

	if (ps.excludeRenote) {
		console.log('excludeRenote');
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
