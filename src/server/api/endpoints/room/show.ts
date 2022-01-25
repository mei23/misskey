import $ from 'cafy';
import define from '../../define';
import ID, { transform } from '../../../../misc/cafy-id';
import Room, { packRoom } from '../../../../models/room';
import { ApiError } from '../../error';
import { getUser } from '../../common/getters';

export const meta = {
	desc: {
		'ja-JP': '指定した部屋の情報を取得します。',
	},

	tags: ['room'],

	requireCredential: false,

	params: {
		userId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},
		floor: {
			validator: $.optional.num.int().min(-999).max(999),
			default: 0,
			desc: {
				'ja-JP': '階数',
				'en-US': 'Number of floors'
			},
		},
	},

	errors: {
		noSuchRoom: {
			message: 'No such room.',
			code: 'NO_SUCH_ROOM',
			id: '68bb0229-65b0-4d95-9e99-48ce49fd632d'
		}
	}
};

export default define(meta, async (ps, me) => {
	const room = await Room.findOne({
		userId: ps.userId,
		floor: ps.floor,
	});

	if (room == null) throw new ApiError(meta.errors.noSuchRoom);

	const u = await getUser(room.userId);
	if (u.isDeleted || u.isSuspended) throw new ApiError(meta.errors.noSuchRoom);

	return await packRoom(room);
});
