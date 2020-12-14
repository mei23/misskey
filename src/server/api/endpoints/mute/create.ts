import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import Mute from '../../../../models/mute';
import define from '../../define';
import { ApiError } from '../../error';
import { getUser } from '../../common/getters';
import { publishMutingChanged } from '../../../../services/create-event';
import { inspect } from 'util';
import { createExpireMuteJob } from '../../../../queue';

export const meta = {
	desc: {
		'ja-JP': 'ユーザーをミュートします。',
		'en-US': 'Mute a user'
	},

	tags: ['account'],

	requireCredential: true,

	kind: ['write:mutes', 'write:account', 'account-write', 'account/write'],

	params: {
		userId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},

		expiresAt: {
			validator: $.optional.nullable.num.int(),
			desc: {
				'ja-JP': 'ミュートの期限',
				'en-US': 'Expires at'
			}
		}
	},

	errors: {
		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '6fef56f3-e765-4957-88e5-c6f65329b8a5'
		},

		muteeIsYourself: {
			message: 'Mutee is yourself.',
			code: 'MUTEE_IS_YOURSELF',
			id: 'a4619cb2-5f23-484b-9301-94c903074e10'
		},

		/*
		alreadyMuting: {
			message: 'You are already muting that user.',
			code: 'ALREADY_MUTING',
			id: '7e7359cb-160c-4956-b08f-4d1c653cd007'
		},
		*/
	}
};

export default define(meta, async (ps, user) => {
	const muter = user;

	// 自分自身
	if (user._id.equals(ps.userId)) {
		throw new ApiError(meta.errors.muteeIsYourself);
	}

	// Get mutee
	const mutee = await getUser(ps.userId).catch(e => {
		if (e.id === '15348ddd-432d-49c2-8a5a-8069753becff') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	// Check if already muting
	const exist = await Mute.findOne({
		muterId: transform(muter._id),
		muteeId: transform(mutee._id)
	});

	// 既存でも既存の期限切れでも常に再採番
	if (exist != null) {
		await Mute.remove({
			_id: exist._id
		});
	}

	// Create mute
	const mute = await Mute.insert({
		createdAt: new Date(),
		muterId: muter._id,
		muteeId: mutee._id,
		expiresAt: ps.expiresAt ? new Date(ps.expiresAt) : undefined
	});

	publishMutingChanged(muter._id);

	if (ps.expiresAt) createExpireMuteJob(mute);

	return;
});
