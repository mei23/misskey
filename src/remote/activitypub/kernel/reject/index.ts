import Resolver from '../../resolver';
import { IRemoteUser } from '../../../../models/user';
import rejectFollow from './follow';
import { IReject, isFollow, getApType } from '../../type';
import { apLogger } from '../../logger';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IReject): Promise<string> => {
	const uri = activity.id || activity;

	logger.info(`Reject: ${uri}`);

	const resolver = new Resolver();

	let object;

	try {
		object = await resolver.resolve(activity.object);
	} catch (e) {
		throw `Resolution failed: ${e}`;
	}

	if (isFollow(object)) return await rejectFollow(actor, object);

	return `skip: Unknown Reject type: ${getApType(object)}`;
};
