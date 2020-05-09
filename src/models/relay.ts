import * as mongo from 'mongodb';
import db from '../db/mongodb';

const Relay = db.get<IRelay>('relays');

Relay.createIndex('inbox', { unique: true });

export default Relay;

export interface IRelay {
	_id: mongo.ObjectID;
	inbox: string;
	status: 'requesting' | 'accepted' | 'rejected';
}
