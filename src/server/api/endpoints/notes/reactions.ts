import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import NoteReaction, { pack } from '../../../../models/note-reaction';
import define from '../../define';
import { GetterError, getNote } from '../../common/getters';
import { ApiError } from '../../error';
import { toDbReaction, toDbReactionNoResolve } from '../../../../misc/reaction-lib';
import { getHideUserIdsById } from '../../common/get-hide-users';

export const meta = {
	desc: {
		'ja-JP': '指定した投稿のリアクション一覧を取得します。',
		'en-US': 'Show reactions of a note.'
	},

	tags: ['notes', 'reactions'],

	requireCredential: false,

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿のID',
				'en-US': 'The ID of the target note'
			}
		},

		type: {
			validator: $.optional.nullable.str,
		},

		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		offset: {
			validator: $.optional.num,
			default: 0
		},

		sinceId: {
			validator: $.optional.type(ID),
			transform: transform,
		},

		untilId: {
			validator: $.optional.type(ID),
			transform: transform,
		},
	},

	res: {
		type: 'array',
		items: {
			type: 'Reaction'
		}
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: '263fff3d-d0e1-4af4-bea7-8408059b451a'
		}
	}
};

export default define(meta, async (ps, user) => {
	const note = await getNote(ps.noteId, user, true).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchNote') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});

	const query = {
		noteId: note._id
	} as any;

	const sort = {
		_id: -1
	};

	if (ps.sinceId) {
		sort._id = 1;
		query._id = {
			$gt: ps.sinceId
		};
	} else if (ps.untilId) {
		query._id = {
			$lt: ps.untilId
		};
	}

	if (ps.type) {
		const type = await toDbReactionNoResolve(ps.type);
		//console.log(`${ps.type} => ${type}`);
		query.reaction = type;

		if (query.reaction === '🍮' || query.reaction === 'pudding') {
			query.reaction = { $in: [ '🍮', 'pudding' ] };
		}
	}

	if (user) {
		const hideUserIds = await getHideUserIdsById(user._id, true, true);
		query.userId = { $nin: hideUserIds };
	}

	const reactions = await NoteReaction.find(query, {
		limit: ps.limit,
		skip: ps.offset,
		sort: sort
	});

	return await Promise.all(reactions.map(reaction => pack(reaction, user)));
});
