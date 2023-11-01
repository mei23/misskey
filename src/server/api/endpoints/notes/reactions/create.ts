import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import createReaction, { ReactionError } from '../../../../../services/note/reaction/create';
import define from '../../../define';
import { GetterError, getNote } from '../../../common/getters';
import { ApiError } from '../../../error';
import { pack } from '../../../../../models/note-reaction';

export const meta = {
	stability: 'stable',

	desc: {
		'ja-JP': '指定した投稿にリアクションします。',
		'en-US': 'React to a note.'
	},

	tags: ['reactions', 'notes'],

	requireCredential: true,

	kind: ['write:reactions', 'reaction-write'],

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿'
			}
		},

		reaction: {
			validator: $.str,
			desc: {
				'ja-JP': 'リアクションの種類'
			}
		},

		dislike: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'きらい'
			}
		},

		_res: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': '_res'
			}
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '033d0620-5bfe-4027-965d-980b0c85a3ea'
		},

		isMyNote: {
			message: 'You can not react to your own notes.',
			code: 'IS_MY_NOTE',
			id: '7eeb9714-b047-43b5-b559-7b1b72810f53'
		},

		alreadyReacted: {
			message: 'You are already reacting to that note.',
			code: 'ALREADY_REACTED',
			id: '71efcf98-86d6-4e2b-b2ad-9d032369366b'
		},

		youHaveBeenBlocked: {
			message: 'You cannot react this note because you have been blocked by this user.',
			code: 'YOU_HAVE_BEEN_BLOCKED',
			id: '20ef5475-9f38-4e4c-bd33-de6d979498ec',
		},
	}
};

export default define(meta, async (ps, user) => {
	const note = await getNote(ps.noteId, user, true).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchNote') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});

	const reaction = await createReaction(user, note, ps.reaction, ps.dislike).catch((e: unknown) => {
		if (e instanceof ReactionError) {
			if (e.type === 'alreadyReacted') throw new ApiError(meta.errors.alreadyReacted);
			if (e.type === 'youHaveBeenBlocked') throw new ApiError(meta.errors.youHaveBeenBlocked);
		}
		throw e;
	});

	if (ps._res) {
		return await pack(reaction);
	} else {
		return;
	}
});
