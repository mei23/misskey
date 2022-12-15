import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import define from '../../define';
import fetchMeta from '../../../../misc/fetch-meta';
import { getHideUserIds } from '../../common/get-hide-users';
import { ApiError } from '../../error';
import { getPackedTimeline } from '../../common/get-timeline';

export const meta = {
	desc: {
		'ja-JP': 'ローカオタイムラインを取得します。'
	},

	tags: ['notes'],

	params: {
		withFiles: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'ファイルが添付された投稿に限定するか否か'
			}
		},

		mediaOnly: {
			validator: $.optional.bool,
			deprecated: true,
			desc: {
				'ja-JP': 'ファイルが添付された投稿に限定するか否か (このパラメータは廃止予定です。代わりに withFiles を使ってください。)'
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

		sinceDate: {
			validator: $.optional.num,
		},

		untilDate: {
			validator: $.optional.num,
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'Note',
		},
	},

	errors: {
		ltlDisabled: {
			message: 'Local timeline has been disabled.',
			code: 'LTL_DISABLED',
			id: '45a6eb02-7695-4393-b023-dd3be9aaaefd'
		},
	}
};

export default define(meta, async (ps, user) => {
	const m = await fetchMeta();
	if (m.disableLocalTimeline) {
		throw new ApiError(meta.errors.ltlDisabled);
	}

	if (!user && m.disableTimelinePreview) {
		throw new ApiError(meta.errors.ltlDisabled);
	}

	// 隠すユーザーを取得
	const hideUserIds = await getHideUserIds(user);

	//#region Construct query
	const sort = {
		_id: -1
	};

	const query = {
		// local
		'_user.host': null,

		// public only
		visibility: 'public',

		localOnly: true,

		deletedAt: null,

		$and: [ {} ]
	} as any;

	if (!m.showReplayInPublicTimeline) {
		query.replyId = null;
	}

	if (hideUserIds && hideUserIds.length > 0) {
		query.userId = {
			$nin: hideUserIds
		};

		// リプライを表示する設定じゃなければリプライ先のミュートは不要
		if (m.showReplayInPublicTimeline) {
			query['_reply.userId'] = {
				$nin: hideUserIds
			};
		}

		query['_renote.userId'] = {
			$nin: hideUserIds
		};
	}

	query['_renote.user.host'] = null;

	const withFiles = ps.withFiles != null ? ps.withFiles : ps.mediaOnly;

	if (withFiles) {
		query.fileIds = { $exists: true, $ne: [] };
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
