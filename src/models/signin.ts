import * as mongo from 'mongodb';
import { cloneDeep as deepcopy } from 'lodash';
import db from '../db/mongodb';

const Signin = db.get<ISignin>('signin');
export default Signin;

export interface ISignin {
	_id: mongo.ObjectID;
	createdAt: Date;
	userId: mongo.ObjectID;
	ip: string;
	headers: any;
	success: boolean;
}

/**
 * Pack a signin record for API response
 *
 * @param {any} record
 * @return {Promise<any>}
 */
export const pack = async (
	record: any
) => {
	const _record = deepcopy(record);

	// Rename _id to id
	_record.id = _record._id;
	delete _record._id;

	return _record;
};
