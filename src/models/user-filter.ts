import * as mongo from 'mongodb';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import { cloneDeep as deepcopy } from 'lodash';
import { pack as packUser, IUser } from './user';
import rap from '@prezzemolo/rap';

const UserFilter = db.get<IUserFilter>('src');
//UserFilter.createIndex('ownerId');
//UserFilter.createIndex('targetId');
UserFilter.createIndex(['ownerId', 'targetId'], { unique: true });
export default UserFilter;

export interface IUserFilter {
	_id: mongo.ObjectID;
	//createdAt: Date;
	ownerId: mongo.ObjectID;
	targetId: mongo.ObjectID;
	hideRenote?: boolean;
}

export const packUserFilterMany = (
	filters: (string | mongo.ObjectID | IUserFilter)[],
	me?: string | mongo.ObjectID | IUser
) => {
	return Promise.all(filters.map(x => packUserFilter(x, me)));
};

export const packUserFilter = async (
	src: any,
	me?: any
) => {
	let populated: IUserFilter;

	// Populate the src if 'src' is ID
	if (isObjectId(src)) {
		populated = await UserFilter.findOne({
			_id: src
		});
	} else if (typeof src === 'string') {
		populated = await UserFilter.findOne({
			_id: new mongo.ObjectID(src)
		});
	} else {
		populated = deepcopy(src);
	}

	const result = {
		id: populated._id,
		//createdAt: populated.createdAt.toISOString(),
		//ownerId: populated.ownerId,
		//owner: packUser(populated.ownerId),
		targetId: populated.targetId,
		target: packUser(populated.targetId),
		hideRenote: !!populated.hideRenote,
	};

	return await rap(result);
};
