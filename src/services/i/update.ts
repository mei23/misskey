import * as mongo from 'mongodb';
import User, { isLocalUser } from '../../models/user';
import renderPerson from '../../remote/activitypub/renderer/person';
import renderUpdate from '../../remote/activitypub/renderer/update';
import { renderActivity } from '../../remote/activitypub/renderer';
import { deliverToFollowers } from '../../remote/activitypub/deliver-manager';

export async function publishToFollowers(userId: mongo.ObjectID) {
	const user = await User.findOne({
		_id: userId
	});

	if (isLocalUser(user) && !user.noFederation) {
		const content = await renderActivity(renderUpdate(await renderPerson(user), user));
		deliverToFollowers(user, content);
	}
}
