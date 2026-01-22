import * as mongo from 'mongodb';
import { cloneDeep as deepcopy } from 'lodash';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';

const UserList = db.get<IUserList>('userList');
export default UserList;

export interface IUserList {
	_id: mongo.ObjectID;
	createdAt: Date;
	title: string;
	userId: mongo.ObjectID;
	userIds: mongo.ObjectID[];
	hosts?: string[];
	hideFromHome?: boolean;
	mediaOnly?: boolean;
}

export const pack = async (
	userList: string | mongo.ObjectID | IUserList
) => {
	let _userList: any;

	if (isObjectId(userList)) {
		_userList = await UserList.findOne({
			_id: userList
		});
	} else if (typeof userList === 'string') {
		_userList = await UserList.findOne({
			_id: new mongo.ObjectID(userList)
		});
	} else {
		_userList = deepcopy(userList);
	}

	if (!_userList) throw `invalid userList arg ${userList}`;

	// Rename _id to id
	_userList.id = _userList._id;
	delete _userList._id;

	_userList.hosts = _userList.hosts || [];

	_userList.hideFromHome = !!_userList.hideFromHome;
	_userList.mediaOnly = !!_userList.mediaOnly;

	return _userList;
};
