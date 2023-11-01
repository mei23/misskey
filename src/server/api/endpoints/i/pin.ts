import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import User, { pack } from '../../../../models/user';
import { PinError, addPinned } from '../../../../services/i/pin';
import define from '../../define';
import { ApiError } from '../../error';
import { publishMainStream } from '../../../../services/stream';

export const meta = {
	stability: 'stable',

	desc: {
		'ja-JP': '指定した投稿をピン留めします。'
	},

	tags: ['account', 'notes'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿のID',
				'en-US': 'Target note ID'
			}
		}
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '56734f8b-3928-431e-bf80-6ff87df40cb3'
		},

		pinLimitExceeded: {
			message: 'You can not pin notes any more.',
			code: 'PIN_LIMIT_EXCEEDED',
			id: '72dab508-c64d-498f-8740-a8eec1ba385a'
		},

		alreadyPinned: {
			message: 'That note has already been pinned.',
			code: 'ALREADY_PINNED',
			id: '8b18c2b7-68fe-4edb-9892-c0cbaeb6c913'
		},
	}
};

export default define(meta, async (ps, user) => {
	await addPinned(user, ps.noteId).catch(e => {
		if (e instanceof PinError) {
			if (e.type === 'noSuchNote') throw new ApiError(meta.errors.noSuchNote);
			if (e.type === 'pinLimitExceeded') throw new ApiError(meta.errors.pinLimitExceeded);
			if (e.type === 'alreadyPinned') throw new ApiError(meta.errors.alreadyPinned);
		}
		throw e;
	});

	const updated = await User.findOne({
		_id: user._id
	});

	const packed = await pack(updated, user, {
		detail: true
	});

	publishMainStream(user._id, 'meUpdated', packed);

	return packed;
});
