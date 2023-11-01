import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import Note, { packMany, INote } from '../../../../models/note';
import define from '../../define';
import { ApiError } from '../../error';
import { GetterError, getNote } from '../../common/getters';

export const meta = {
	desc: {
		'ja-JP': '指定した投稿の文脈を取得します。',
		'en-US': 'Show conversation of a note.'
	},

	tags: ['notes'],

	requireCredential: false,

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿のID',
				'en-US': 'Target note ID'
			}
		},

		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		offset: {
			validator: $.optional.num.min(0),
			default: 0
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'Note',
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'e1035875-9551-45ec-afa8-1ded1fcb53c8'
		}
	}
};

export default define(meta, async (ps, user) => {
	const note = await getNote(ps.noteId, user, true).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchNote') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});

	const conversation: INote[] = [];
	let i = 0;

	async function get(id: any) {
		i++;
		const p = await Note.findOne({ _id: id });

		if (i > ps.offset) {
			conversation.push(p);
		}

		if (conversation.length == ps.limit) {
			return;
		}

		if (p.replyId) {
			await get(p.replyId);
		}
	}

	if (note.replyId) {
		await get(note.replyId);
	}

	return await packMany(conversation, user);
});
