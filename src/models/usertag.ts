import * as mongo from 'mongodb';
import db from '../db/mongodb';

const Usertag = db.get<IUsertag>('usertags');
Usertag.createIndex(['ownerId', 'targetId'], { unique: true });
Usertag.createIndex('tags');

export default Usertag;

export type IUsertag = {
	_id: mongo.ObjectID;
	ownerId: mongo.ObjectID;
	targetId: mongo.ObjectID;
	tags: string[];
};
