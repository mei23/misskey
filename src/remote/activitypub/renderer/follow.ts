import rndstr from 'rndstr';
import config from '../../../config';
import { IUser, isLocalUser, isRemoteUser } from '../../../models/user';

export default (follower: IUser, followee: IUser, requestId?: string) => {
	const follow = {
		type: 'Follow',
		actor: isLocalUser(follower) ? `${config.url}/users/${follower._id}` : follower.uri,
		object: isLocalUser(followee) ? `${config.url}/users/${followee._id}` : followee.uri
	} as any;

	if (requestId) {
		follow.id = requestId;
	} else if (isLocalUser(follower) && isRemoteUser(followee)) {
		follow.id = `${config.url}/followings_from/${follower._id}/${rndstr(8)}`;
	}

	return follow;
};
