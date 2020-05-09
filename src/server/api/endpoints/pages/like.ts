import $ from 'cafy';
import ID from '../../../../misc/cafy-id';
import define from '../../define';
import { ApiError } from '../../error';
import Page from '../../../../models/page';
import PageLike from '../../../../models/page-like';

export const meta = {
	desc: {
		'ja-JP': '指定したページを「いいね」します。',
	},

	tags: ['pages'],

	requireCredential: true,

	kind: ['write:page-likes', 'write:favorites', 'favorite-write'],

	params: {
		pageId: {
			validator: $.type(ID),
			desc: {
				'ja-JP': '対象のページのID',
				'en-US': 'Target page ID.'
			}
		}
	},

	errors: {
		noSuchPage: {
			message: 'No such page.',
			code: 'NO_SUCH_PAGE',
			id: 'cc98a8a2-0dc3-4123-b198-62c71df18ed3'
		},

		alreadyLiked: {
			message: 'The page has already been liked.',
			code: 'ALREADY_LIKED',
			id: 'cc98a8a2-0dc3-4123-b198-62c71df18ed3'
		},
	}
};

export default define(meta, async (ps, user) => {
	const page = await Page.findOne(ps.pageId);
	if (page == null) {
		throw new ApiError(meta.errors.noSuchPage);
	}

	// if already liked
	const exist = await PageLike.findOne({
		pageId: page._id,
		userId: user._id
	});

	if (exist != null) {
		throw new ApiError(meta.errors.alreadyLiked);
	}

	// Create like
	await PageLike.insert({
		createdAt: new Date(),
		pageId: page._id,
		userId: user._id
	});

	await Page.update({ _id: page._id }, {
		$inc: {
			likedCount: 1
		}
	});
});
