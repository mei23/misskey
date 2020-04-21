import { IRemoteUser, isLocalUser } from '../../../../models/user';
import accept from '../../../../services/following/requests/accept';
import { IFollow } from '../../type';
import DbResolver from '../../db-resolver';

export default async (actor: IRemoteUser, activity: IFollow): Promise<string> => {
	// ※ activityはこっちから投げたフォローリクエストなので、activity.actorは存在するローカルユーザーである必要がある

	const dbResolver = new DbResolver();
	const follower = await dbResolver.getUserFromApId(activity.actor);

	if (follower == null) {
		return `skip: follower not found`;
	}

	if (!isLocalUser(follower)) {
		return `skip: follower is not a local user`;
	}

	await accept(actor, follower);
	return `ok`;
};
