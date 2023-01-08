import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import { genTypeFilterRegex, typeFilterValidater } from '../../../../misc/mime-type-filter';
import DriveFile, { packMany } from '../../../../models/drive-file';
import define from '../../define';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: ['read:drive', 'drive-read'],

	params: {
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

		type: {
			validator: $.optional.str.match(typeFilterValidater)
		}
	},

	res: {
		type: 'array',
		items: {
			type: 'DriveFile',
		},
	},
};

export default define(meta, async (ps, user) => {
	const sort = {
		_id: -1
	};

	const query = {
		'metadata.userId': user._id,
		'metadata.deletedAt': { $exists: false }
	} as any;

	if (ps.sinceId) {
		sort._id = 1;
		query._id = {
			$gt: ps.sinceId
		};
	} else if (ps.untilId) {
		query._id = {
			$lt: ps.untilId
		};
	}

	if (ps.type) {
		query.contentType = genTypeFilterRegex(ps.type);
	}

	const files = await DriveFile
		.find(query, {
			limit: ps.limit,
			sort: sort
		});

		return await packMany(files, { self: true });
});
