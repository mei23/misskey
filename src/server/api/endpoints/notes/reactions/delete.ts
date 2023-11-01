import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import define from '../../../define';
import deleteReaction, { ReactionDeleteError } from '../../../../../services/note/reaction/delete';
import { GetterError, getNote } from '../../../common/getters';
import { ApiError } from '../../../error';

export const meta = {
	desc: {
		'ja-JP': '指定した投稿へのリアクションを取り消します。',
		'en-US': 'Unreact to a note.'
	},

	tags: ['reactions', 'notes'],

	requireCredential: true,

	kind: ['write:reactions', 'reaction-write'],

	limit: {
		minInterval: 500
	},

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿のID',
				'en-US': 'Target note ID'
			}
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '764d9fce-f9f2-4a0e-92b1-6ceac9a7ad37'
		},

		notReacted: {
			message: 'You are not reacting to that note.',
			code: 'NOT_REACTED',
			id: '92f4426d-4196-4125-aa5b-02943e2ec8fc'
		},
	}
};

export default define(meta, async (ps, user) => {
	const note = await getNote(ps.noteId).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchNote') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});
	await deleteReaction(user, note).catch(e => {
		if (e instanceof ReactionDeleteError && e.type === 'notReacted') throw new ApiError(meta.errors.notReacted);
		throw e;
	});
});
