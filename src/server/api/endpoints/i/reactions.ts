import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import define from '../../define';
import NoteReaction from '../../../../models/note-reaction';
import * as mongo from 'mongodb';
import { cloneDeep as deepcopy } from 'lodash';
import isObjectId from '../../../../misc/is-objectid';
import { pack as packNote } from '../../../../models/note';
import { dbLogger } from '../../../../db/logger';

export const meta = {
	desc: {
		'ja-JP': 'リアクションした投稿一覧を取得します。',
		'en-US': 'Get reacted notes'
	},

	tags: ['account', 'notes', 'reactions'],

	requireCredential: true,

	kind: ['read:account', 'account-read', 'account/read'],

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		sinceId: {
			validator: $.optional.type(ID),
			transform: transform,
		},

		untilId: {
			validator: $.optional.type(ID),
			transform: transform,
		}
	}
};

export default define(meta, async (ps, user) => {
	const query = {
		userId: user._id
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

	// Get reactions
	const reactions = await NoteReaction
		.find(query, {
			limit: ps.limit,
			sort: sort
		});

	return await packMany(reactions, user);
});

export const packMany = (
	favorites: any[],
	me: any
) => {
	return Promise.all(favorites.map(f => pack(f, me)));
};

/**
 * Pack a favorite for API response
 */
export const pack = async (
	reaction: any,
	me: any
) => {
	let _reaction: any;

	// Populate
	if (isObjectId(reaction)) {
		_reaction = await NoteReaction.findOne({
			_id: reaction
		});
	} else if (typeof reaction === 'string') {
		_reaction = await NoteReaction.findOne({
			_id: new mongo.ObjectID(reaction)
		});
	} else {
		_reaction = deepcopy(reaction);
	}

	// Rename _id to id
	_reaction.id = _reaction._id;
	delete _reaction._id;

	// Populate note
	_reaction.note = await packNote(_reaction.noteId, me, {
		detail: true
	});

	// (データベースの不具合などで)投稿が見つからなかったら
	if (_reaction.note == null) {
		dbLogger.warn(`[DAMAGED DB] (missing) pkg: reaction -> note :: ${_reaction.id} (note ${_reaction.noteId})`);
		return null;
	}

	return _reaction;
};
