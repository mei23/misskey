import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import DriveFolder, { pack } from '../../../../../models/drive-folder';
import define from '../../../define';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	kind: ['read:drive', 'drive-read'],

	params: {
		name: {
			validator: $.str
		},

		parentId: {
			validator: $.optional.nullable.type(ID),
			transform: transform,
			default: null as any,
			desc: {
				'ja-JP': 'フォルダID'
			}
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'DriveFolder',
		},
	},
};

export default define(meta, async (ps, user) => {
	const folders = await DriveFolder
		.find({
			name: ps.name,
			userId: user._id,
			parentId: ps.parentId
		});

	return await Promise.all(folders.map(folder => pack(folder)));
});
