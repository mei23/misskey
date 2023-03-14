import $ from 'cafy';
import Note from '../../../../models/note';
import { packMany } from '../../../../models/note';
import define from '../../define';
import { getHideUserIds } from '../../common/get-hide-users';
import fetchMeta from '../../../../misc/fetch-meta';

export const meta = {
	desc: {
		'ja-JP': 'Featuredな投稿を取得します。',
		'en-US': 'Get featured notes.'
	},

	tags: ['notes'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 600,

	params: {
		minScore: {
			validator: $.optional.num.range(0, 100),
			default: 5,
			desc: {
				'ja-JP': '最低スコア'
			}
		},
		limit: {
			validator: $.optional.num.range(0, 100),
			default: 10,
			desc: {
				'ja-JP': '最大数'
			}
		},
		offset: {
			validator: $.optional.num.min(0),
			default: 0,
			desc: {
				'ja-JP': 'オフセット'
			}
		},
		fileType: {
			validator: $.optional.arr($.str),
			desc: {
				'ja-JP': '指定された種類のファイルが添付された投稿のみを取得します'
			}
		},
		excludeNsfw: {
			validator: $.optional.boolean,
			default: false,
			desc: {
				'ja-JP': 'true にするとNSFWを除外します'
			}
		},
		excludeSfw: {
			validator: $.optional.boolean,
			default: false,
			desc: {
				'ja-JP': 'NSFWのみ'
			}
		},
		includeGlobal: {
			validator: $.optional.boolean,
			default: false,
			desc: {
				'ja-JP': 'true にすると連合を含めます'
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

// これは指定期間のをスコアが高い順にリストするが
// クライアントではこれを日付順にソートしている

export default define(meta, async (ps, user) => {
	const m = await fetchMeta();
	if (!user && m.disableTimelinePreview) {
		return [];
	}

	if (ps.excludeNsfw && ps.excludeSfw) return [];

	const hideUserIds = await getHideUserIds(user);

	const query = {
		deletedAt: null,
		visibility: 'public',
		score: { $gte: ps.minScore },
		localOnly: { $ne: true },
		...(hideUserIds && hideUserIds.length > 0 ? { userId: { $nin: hideUserIds } } : {})
	} as any;

	if (!ps.includeGlobal) {
		query['_user.host'] = null;
	}

	if (ps.excludeNsfw) {
		query['_files.metadata.isSensitive'] = {
			$ne: true
		};
		query['cw'] = null;
	}

	if (ps.excludeSfw) {
		query['_files.metadata.isSensitive'] = true;
	}

	if (ps.fileType) {
		query.fileIds = { $exists: true, $ne: [] };

		query['_files.contentType'] = {
			$in: ps.fileType
		};
	}

	const notes = await Note.find(query, {
		maxTimeMS: 20000,
		limit: ps.limit,
		skip: ps.offset,
		sort: { _id: -1 }
	});

	return await packMany(notes, user);
});
