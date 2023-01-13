import * as mongo from 'mongodb';
import db from '../db/mongodb';

const RegistrationTicket = db.get<IRegistrationTicket>('registrationTickets');
RegistrationTicket.createIndex('code', { unique: true });
export default RegistrationTicket;

export interface IRegistrationTicket {
	_id: mongo.ObjectID;
	createdAt: Date;
	code: string;
	expiresAt?: Date;
	inviterId?: mongo.ObjectID;
	inviteeIds?: mongo.ObjectID[];
	restCount?: number;
}
