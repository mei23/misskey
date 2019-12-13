import config from '../../../config';
import { ILocalUser } from '../../../models/user';
import { IMessagingMessage } from '../../../models/messaging-message';

export const renderReadActivity = (user: ILocalUser, message: IMessagingMessage) => ({
	type: 'Read',
	actor: `${config.url}/users/${user._id}`,
	object: message.uri
});
