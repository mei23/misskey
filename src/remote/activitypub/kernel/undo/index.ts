import { IRemoteUser } from '../../../../models/user';
import { IUndo, isFollow, isLike, isAnnounce, getApType, isBlock } from '../../type';
import unfollow from './follow';
import unblock from './block';
import undoLike from './like';
import Resolver from '../../resolver';
import { apLogger } from '../../logger';
import { undoAnnounce } from './announce';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IUndo): Promise<string> => {
	if ('actor' in activity && actor.uri !== activity.actor) {
		return `skip: invalid actor`;
	}

	const uri = activity.id || activity;

	logger.info(`Undo: ${uri}`);

	const resolver = new Resolver();

	let object;

	try {
		object = await resolver.resolve(activity.object);
	} catch (e) {
		return `skip: Resolution failed: ${e}`;
	}

	if (isFollow(object)) return await unfollow(actor, object);
	if (isBlock(object)) return await unblock(actor, object);
	if (isLike(object)) return await undoLike(actor, object);
	if (isAnnounce(object)) return await undoAnnounce(actor, object);

	return `skip: unknown object type ${getApType(object)}`;
};
