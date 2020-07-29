import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import define from '../../define';
import { ApiError } from '../../error';
import { getUser } from '../../common/getters';
import * as mongo from 'mongodb';
import Usertag from '../../../../models/usertag';

export const meta = {
	desc: {
		'ja-JP': 'ユーザータグを追加します'
	},

	tags: ['usertags'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
		targetId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},

		tag: {
			validator: $.str,
			desc: {
				'ja-JP': '対象のタグ'
			}
		}
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '7179643b-33eb-4055-9dda-18befac06c14'
		},
	}
};

export default define(meta, async (ps, user) => {
	const target = await getUser(ps.targetId as mongo.ObjectId).catch(e => {
		if (e.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	const usertag = await Usertag.findOne({
		ownerId: user._id,
		targetId: target._id
	});

	if (usertag == null) {
		await Usertag.insert({
			ownerId: user._id,
			targetId: target._id,
			tags: [ ps.tag ]
		});
	} else {
		if (usertag.tags.includes(ps.tag)) return;
		await Usertag.update({ _id: usertag._id }, {
			$push: {
				tags: ps.tag
			}
		});
	}
});
