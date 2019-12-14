import * as mongo from 'mongodb';
import { IRemoteUser } from '../../../models/user';
import { IRead, getApId } from '../type';
import { isSelfHost, extractApHost } from '../../../misc/convert-host';
import MessagingMessage from '../../../models/messaging-message';
import readMessagingMessage from '../../../server/api/common/read-messaging-message';

export const performReadActivity = async (actor: IRemoteUser, activity: IRead): Promise<string> => {
	const id = getApId(activity.object);

	if (!isSelfHost(extractApHost(id))) {
		return `skip: Read to foreign host (${id})`;
	}

	const messageId = new mongo.ObjectID(id.split('/').pop());

	const message = await MessagingMessage.findOne({ _id: messageId });
	if (message == null) {
		return `skip: message not found`;
	}

	if (`${actor._id}` !== `${message.recipientId}`) {
		return `skip: actor is not a message recipient ${actor._id} ${message.recipientId}`;
	}

	await readMessagingMessage(message.recipientId, message.userId, message._id);
	return `ok: mark as read (${message.userId} => ${message.recipientId} ${message._id})`;
};
