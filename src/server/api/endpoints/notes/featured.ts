import $ from 'cafy';
import Note from '../../../../models/note';
import { packMany } from '../../../../models/note';
import define from '../../define';
import { getHideUserIds } from '../../common/get-hide-users';
import { genMeid7 } from '../../../../misc/id/meid7';
import * as mongo from 'mongodb';
import fetchMeta from '../../../../misc/fetch-meta';

export const meta = {
	desc: {
		'ja-JP': 'Featuredな投稿を取得します。',
		'en-US': 'Get featured notes.'
	},

	tags: ['notes'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 300,

	params: {
		days: {
			validator: $.optional.num.range(0, 33),
			default: 2,
			desc: {
				'ja-JP': '集計期間 (日)'
			}
		},
		limit: {
			validator: $.optional.num.range(0, 100),
			default: 10,
			desc: {
				'ja-JP': '最大数'
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

	const day = 1000 * 60 * 60 * 24 * ps.days;

	const hideUserIds = await getHideUserIds(user);

	const id = genMeid7(new Date(Date.now() - day));

	const query = {
		_id: {
			$gt: new mongo.ObjectID(id)
		},
		deletedAt: null,
		visibility: 'public',
		score: { $gt: 1 },
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
		limit: ps.limit,
		sort: {
			score: -1
		}
	});

	return await packMany(notes, user);
});
