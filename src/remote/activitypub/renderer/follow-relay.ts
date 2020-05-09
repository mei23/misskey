import config from '../../../config';
import { IRelay } from '../../../models/relay';
import { ILocalUser } from '../../../models/user';

export function renderFollowRelay(relay: IRelay, relayActor: ILocalUser) {
	const follow = {
		id: `${config.url}/activities/follow-relay/${relay._id}`,
		type: 'Follow',
		actor: `${config.url}/users/${relayActor._id}`,
		object: 'https://www.w3.org/ns/activitystreams#Public'
	};

	return follow;
}
