import config from '../../../config';
import { ILocalUser } from '../../../models/user';
import * as mongo from 'mongodb';

export const renderReadActivity = (user: ILocalUser, messageId: mongo.ObjectID) => ({
	type: 'Read',
	actor: `${config.url}/users/${user._id}`,
	object: `${config.url}/notes/${messageId}`
});
