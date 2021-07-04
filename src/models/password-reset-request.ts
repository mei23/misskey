import * as mongo from 'mongodb';
import db from '../db/mongodb';

const PasswordResetRequest = db.get<IPasswordResetRequest>('passwordResetRequests');
PasswordResetRequest.createIndex('createdAt', { expireAfterSeconds: 3600 * 24 * 3 });
PasswordResetRequest.createIndex('token', { unique: true });

export default PasswordResetRequest;

export interface IPasswordResetRequest {
	_id: mongo.ObjectID;
	createdAt: Date;
	token: string;
	userId: mongo.ObjectID;
}
