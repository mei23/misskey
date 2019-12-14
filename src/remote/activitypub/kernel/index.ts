import { isCreate, isDelete, isUpdate, isRead, isFollow, isAccept, isReject, isAdd, isRemove, isAnnounce, isLike, isUndo, isBlock, isCollectionOrOrderedCollection, isCollection, IObject } from '../type';
import { IRemoteUser } from '../../../models/user';
import create from './create';
import performDeleteActivity from './delete';
import performUpdateActivity from './update';
import { performReadActivity } from './read';
import follow from './follow';
import undo from './undo';
import like from './like';
import announce from './announce';
import accept from './accept';
import reject from './reject';
import add from './add';
import remove from './remove';
import block from './block';
import { apLogger } from '../logger';
import Resolver from '../resolver';
import { toArray } from '../../../prelude/array';

export async function performActivity(actor: IRemoteUser, activity: IObject) {
	if (isCollectionOrOrderedCollection(activity)) {
		const resolver = new Resolver();
		for (const item of toArray(isCollection(activity) ? activity.items : activity.orderedItems)) {
			try {
				const act = await resolver.resolve(item);
				const result = await performOneActivity(actor, act);
				apLogger.info(`processed: ${result}`);
			} catch (e) {
				apLogger.warn(`failed: ${e}`);
				continue;
			}
		}
	} else {
		return await performOneActivity(actor, activity);
	}
}

export async function performOneActivity(actor: IRemoteUser, activity: IObject) {
	if (actor.isSuspended) return 'skip: actor is suspended';

	if (isCreate(activity)) {
		return await create(actor, activity);
	} else if (isDelete(activity)) {
		return await performDeleteActivity(actor, activity);
	} else if (isUpdate(activity)) {
		return await performUpdateActivity(actor, activity);
	} else if (isRead(activity)) {
		return await performReadActivity(actor, activity);
	} else if (isFollow(activity)) {
		return await follow(actor, activity);
	} else if (isAccept(activity)) {
		return await accept(actor, activity);
	} else if (isReject(activity)) {
		return await reject(actor, activity);
	} else if (isAdd(activity)) {
		return await add(actor, activity).catch(err => apLogger.error(err));
	} else if (isRemove(activity)) {
		return await remove(actor, activity).catch(err => apLogger.error(err));
	} else if (isAnnounce(activity)) {
		return await announce(actor, activity);
	} else if (isLike(activity)) {
		return await like(actor, activity);
	} else if (isUndo(activity)) {
		return await undo(actor, activity);
	} else if (isBlock(activity)) {
		return await block(actor, activity);
	} else {
		return `skip: unknown activity type: ${(activity as any).type}`;
	}
}
