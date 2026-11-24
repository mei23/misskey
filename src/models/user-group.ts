import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import { PackedUserGroup } from './packed-schemas';
import { toOidString } from '../misc/pack-utils';

const UserGroup = db.get<IUserGroup>('userGroup');
export default UserGroup;

export interface IUserGroup {
	_id: mongo.ObjectID;
	createdAt: Date;
	name: string;
	userId: mongo.ObjectID;
	userIds: mongo.ObjectID[];
}

export async function packUserGroup(
	userGroup: string | mongo.ObjectID | IUserGroup
): Promise<PackedUserGroup> {
	let doc: IUserGroup | undefined;

	if (isObjectId(userGroup)) {
		doc = await UserGroup.findOne({
			_id: userGroup
		});
	} else if (typeof userGroup === 'string') {
		doc = await UserGroup.findOne({
			_id: new mongo.ObjectID(userGroup)
		});
	} else {
		doc = deepcopy(userGroup);
	}

	if (!doc) throw `invalid userGroup arg ${userGroup}`;

	return {
		id: toOidString(doc._id),
		createdAt: doc.createdAt.toISOString(),
		name: doc.name,
		userId: doc.userId,
		userIds: doc.userIds,
	};
}
