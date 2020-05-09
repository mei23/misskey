import $ from 'cafy';
import * as ms from 'ms';
import define from '../../define';
import ID, { transform } from '../../../../misc/cafy-id';
import { ApiError } from '../../error';
import DriveFile from '../../../../models/drive-file';
import Page, { packPage } from '../../../../models/page';

export const meta = {
	desc: {
		'ja-JP': 'ページを作成します。',
	},

	tags: ['pages'],

	requireCredential: true,

	kind: ['write:pages', 'write:notes', 'note-write'],

	limit: {
		duration: ms('1hour'),
		max: 300
	},

	params: {
		title: {
			validator: $.str,
		},

		name: {
			validator: $.str.min(1),
		},

		summary: {
			validator: $.optional.nullable.str,
		},

		content: {
			validator: $.arr($.obj())
		},

		variables: {
			validator: $.arr($.obj())
		},

		eyeCatchingImageId: {
			validator: $.optional.nullable.type(ID),
			transform: transform,
		},

		font: {
			validator: $.optional.str.or(['serif', 'sans-serif']),
			default: 'sans-serif'
		},

		alignCenter: {
			validator: $.optional.bool,
			default: false
		},

		sensitive: {
			validator: $.optional.bool,
			default: false
		},

		hideTitleWhenPinned: {
			validator: $.optional.bool,
			default: false
		},
	},

	res: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		ref: 'Page',
	},

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'b7b97489-0f66-4b12-a5ff-b21bd63f6e1c'
		},
		nameAlreadyExists: {
			message: 'Specified name already exists.',
			code: 'NAME_ALREADY_EXISTS',
			id: '4650348e-301c-499a-83c9-6aa988c66bc1'
		}
	}
};

export default define(meta, async (ps, user) => {
	let eyeCatchingImage = null;
	if (ps.eyeCatchingImageId != null) {
		eyeCatchingImage = await DriveFile.findOne({
			_id: ps.eyeCatchingImageId,
			'metadata.userId': user._id
		});

		if (eyeCatchingImage == null) {
			throw new ApiError(meta.errors.noSuchFile);
		}
	}

	await Page.find({
		userId: user._id,
		name: ps.name
	}).then(result => {
		if (result.length > 0) {
			throw new ApiError(meta.errors.nameAlreadyExists);
		}
	});

	const now = new Date();

	const page = await Page.insert({
		createdAt: now,
		updatedAt: now,
		title: ps.title,
		name: ps.name,
		summary: ps.summary,
		alignCenter: ps.alignCenter,
		sensitive: ps.sensitive,
		hideTitleWhenPinned: ps.hideTitleWhenPinned,
		font: ps.font,
		userId: user._id,
		eyeCatchingImageId: eyeCatchingImage?._id,
		content: ps.content,
		variables: ps.variables,
		visibility: 'public',
		visibleUserIds: [],
		likedCount: 0,
	});

	return await packPage(page, user._id);
});
