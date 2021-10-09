import $ from 'cafy';
import Emoji from '../../../../../models/emoji';
import define from '../../../define';
import { escapeRegExp } from 'lodash';
import { getEmojiUrl } from '../../../../../misc/pack-emojis';

export const meta = {
	desc: {
		'ja-JP': 'カスタム絵文字を取得します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		offset: {
			validator: $.optional.num.min(0),
			default: 0
		},

		remote: {
			validator: $.optional.bool,
		},

		newer: {
			validator: $.optional.bool,
		},

		name: {
			validator: $.optional.str
		},

		host: {
			validator: $.optional.nullable.str
		}
	}
};

export default define(meta, async (ps) => {
	const query = {
		host: ps.remote ? { $ne: null } : null
	} as any;

	if (ps.name) {
		query.name = new RegExp(escapeRegExp(ps.name.toLowerCase()));
	}

	if (ps.host !== undefined) {
		query.host = ps.host;
	}

	if (ps.newer) {
		const ex1 = await Emoji.find({
			host: null,
			md5: { $ne: null }
		});

		const ex2 = ex1.map(x => x.md5);

		query.md5 = { $nin: ex2 };
	}

	const emojis = await Emoji.find(query, {
		sort: { _id: -1 },
		skip: ps.offset,
		limit: ps.limit
	});

	return emojis.map(e => ({
		id: e._id,
		name: e.name,
		category: e.category,
		aliases: e.aliases,
		host: e.host,
		url: getEmojiUrl(e),
		type: e.type,
		md5: e.md5,
	}));
});
