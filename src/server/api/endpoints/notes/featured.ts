import $ from 'cafy';
import { packMany } from '../../../../models/note';
import define from '../../define';
import { getHideUserIds } from '../../common/get-hide-users';
import { findJoinedNotes } from '../../common/find-joinedn-notes';

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
			validator: $.optional.either($.optional.num.range(0, 9999), $.str.pipe(v => 0 <= Number(v) && Number(v) <= 9999)),
			default: 2,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': '集計期間 (日)'
			}
		},
		limit: {
			validator: $.optional.either($.optional.num.range(0, 100), $.str.pipe(v => 0 <= Number(v) && Number(v) <= 100)),
			default: 10,
			transform: (v: any) => JSON.parse(v),
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
			validator: $.optional.either($.boolean, $.str.or(['true', 'false'])),	// optional bool with string
			default: false,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': 'true にするとNSFWを除外します'
			}
		},
		excludeSfw: {
			validator: $.optional.either($.boolean, $.str.or(['true', 'false'])),	// optional bool with string
			default: false,
			transform: (v: any) => JSON.parse(v),
			desc: {
				'ja-JP': 'NSFWのみ'
			}
		},
		includeGlobal: {
			validator: $.optional.either($.boolean, $.str.or(['true', 'false'])),	// optional bool with string
			default: false,
			transform: (v: any) => JSON.parse(v),
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

export default define(meta, async (ps, user) => {
	const day = 1000 * 60 * 60 * 24 * ps.days;

	const hideUserIds = await getHideUserIds(user);

	const query = {
		createdAt: {
			$gt: new Date(Date.now() - day)
		},
		deletedAt: null,
		visibility: 'public',
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

	const notes = await findJoinedNotes(query, { score: -1 }, ps.limit!);

	return await packMany(notes, user);
});
