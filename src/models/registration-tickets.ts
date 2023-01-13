import * as mongo from 'mongodb';
import db from '../db/mongodb';
import { packedInvitation } from './packed-schemas';
import { pack as packUser } from './user';

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

export async function packRegistrationTicket(src: IRegistrationTicket): Promise<packedInvitation> {
	return {
		id: src._id,
		code: src.code,
		createdAt: src.createdAt.toISOString(),
		expiredAt: src.expiresAt?.toISOString(),
		inviterId: src.inviterId,
		inviteeIds: src.inviterId,
		inviter: src.inviterId && await packUser(src.inviterId),
		invitees: src.inviteeIds && await Promise.all(src.inviteeIds.map(x => packUser(x))),
		restCount: src.restCount,
	};
}
