import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import { pack as packUser } from './user';

const NoteReaction = db.get<INoteReaction>('noteReactions');
NoteReaction.createIndex(['noteId', 'userId'], { unique: true });
NoteReaction.dropIndex('noteId').catch(() => {});
NoteReaction.createIndex('userId');
NoteReaction.dropIndex(['userId', 'noteId'], { unique: true }).catch(() => {});
export default NoteReaction;

export interface INoteReaction {
	_id: mongo.ObjectID;
	/** AP id (remote only) */
	uri?: string;
	createdAt: Date;
	noteId: mongo.ObjectID;
	userId: mongo.ObjectID;
	reaction: string;
	dislike?: boolean;
}

/**
 * Pack a reaction for API response
 */
export const pack = async (
	reaction: any,
	me?: any
) => {
	let _reaction: any;

	// Populate the reaction if 'reaction' is ID
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

	// Populate user
	_reaction.user = await packUser(_reaction.userId, me);

	return _reaction;
};
