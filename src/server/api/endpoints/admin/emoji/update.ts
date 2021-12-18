import $ from 'cafy';
import Emoji from '../../../../../models/emoji';
import define from '../../../define';
import ID from '../../../../../misc/cafy-id';
import { detectUrlMime } from '../../../../../misc/detect-url-mime';

export const meta = {
	desc: {
		'ja-JP': 'カスタム絵文字を更新します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		id: {
			validator: $.type(ID)
		},

		name: {
			validator: $.str
		},

		category: {
			validator: $.optional.str
		},

		url: {
			validator: $.str
		},

		aliases: {
			validator: $.arr($.str)
		},

		direction: {
			validator: $.optional.str.or(['left', 'right'])
		}
	}
};

export default define(meta, async (ps) => {
	const emoji = await Emoji.findOne({
		_id: ps.id
	});

	if (emoji == null) throw new Error('emoji not found');

	const { mime, md5 } = await detectUrlMime(ps.url);

	await Emoji.update({ _id: emoji._id }, {
		$set: {
			updatedAt: new Date(),
			name: ps.name,
			category: ps.category,
			aliases: ps.aliases,
			url: ps.url,
			type: mime,
			md5,
			direction: ps.direction
		}
	});

	return;
});
