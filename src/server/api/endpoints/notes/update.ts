import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import * as ms from 'ms';
import { length } from 'stringz';
import Note, { isValidCw } from '../../../../models/note';
import define from '../../define';
import fetchMeta from '../../../../misc/fetch-meta';
import { ApiError } from '../../error';
import { getNote } from '../../common/getters';
import { publishNoteStream } from '../../../../services/stream';
import { oidEquals } from '../../../../prelude/oid';

let maxNoteTextLength = 1000;

setInterval(() => {
	fetchMeta().then(m => {
		maxNoteTextLength = m.maxNoteTextLength || maxNoteTextLength;
	});
}, 60000);

export const meta = {
	desc: {
		'ja-JP': '更新します。'
	},

	tags: ['notes'],

	requireCredential: true,

	limit: {
		duration: ms('1hour'),
		max: 300
	},

	kind: ['write:notes', 'note-write'],

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿のID',
			}
		},

		text: {
			validator: $.optional.nullable.str.pipe(text =>
				length(text?.trim()) <= maxNoteTextLength
					&& length(text?.trim()) >= 1	// 更新の場合は空にできないことにする
			),
			default: null as any,
			desc: {
				'ja-JP': '投稿内容'
			}
		},

		cw: {
			validator: $.optional.nullable.str.pipe(isValidCw),
			desc: {
				'ja-JP': 'コンテンツの警告。このパラメータを指定すると設定したテキストで投稿のコンテンツを隠す事が出来ます。'
			}
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'a6584e14-6e01-4ad3-b566-851e7bf0d474',
		},
	}
};

export default define(meta, async (ps, user, app) => {
	const note = await getNote(ps.noteId, user).catch(e => {
		if (e.id === '9725d0ce-ba28-4dde-95a7-2cbb2c15de24') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});

	if (!oidEquals(note.userId, user._id)) {
		throw new ApiError(meta.errors.noSuchNote);
	}

	const updates = {
		updatedAt: new Date(),
		text: ps.text?.trim(),
		cw: ps.cw ?? null,
		// TODO: tags, mentions, emojis
	};

	await Note.update({ _id: note._id }, {
		$set: updates
	});

	publishNoteStream(note._id, 'updated', updates);
});
