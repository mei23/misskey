import Resolver from '../../resolver';
import { IRemoteUser } from '../../../../models/user';
import acceptFollow from './follow';
import { IAccept, isFollow, getApType } from '../../type';
import { apLogger } from '../../logger';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IAccept): Promise<string> => {
	const uri = activity.id || activity;

	logger.info(`Accept: ${uri}`);

	const resolver = new Resolver();

	let object;

	try {
		// TODO: Accept.objectはローカルアクティビティなのでここでResolveするのはおかしい。Follow Activityは公開していない上にidも適当なのでここでstringが来たら何も出来ない。
		object = await resolver.resolve(activity.object);
	} catch (e) {
		logger.error(`Resolution failed: ${e}`);
		throw e;
	}

	if (isFollow(object)) return await acceptFollow(actor, object);

	return `skip: Unknown Accept type: ${getApType(object)}`;
};
