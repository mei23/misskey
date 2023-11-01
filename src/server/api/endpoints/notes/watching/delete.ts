import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import define from '../../../define';
import unwatch from '../../../../../services/note/unwatch';
import { GetterError, getNote } from '../../../common/getters';
import { ApiError } from '../../../error';

export const meta = {
	stability: 'stable',

	desc: {
		'ja-JP': '指定した投稿のウォッチを解除します。',
		'en-US': 'Unwatch a note.'
	},

	tags: ['notes'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿のID',
				'en-US': 'Target note ID.'
			}
		}
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '09b3695c-f72c-4731-a428-7cff825fc82e'
		}
	}
};

export default define(meta, async (ps, user) => {
	const note = await getNote(ps.noteId).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchNote') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});

	await unwatch(user._id, note);
});
