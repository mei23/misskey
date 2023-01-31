import * as mongo from 'mongodb';
import Mute from '../../../models/mute';
import User, { IUser } from '../../../models/user';
import { unique } from '../../../prelude/array';
import Blocking from '../../../models/blocking';

export async function getHideUserIds(me: IUser | null, includeSilenced = true, includeSuspended = true, allowNotification = false) {
	return await getHideUserIdsById(me ? me._id : null, includeSilenced, includeSuspended, allowNotification);
}

export async function getHideUserIdsById(meId?: mongo.ObjectID | null, includeSilenced = true, includeSuspended = true, allowNotification = false) {
	const [deleted, suspended, silenced, muted, blocking, blocked] = await Promise.all([
		User.find({
			isDeleted: true
		}, {
			fields: {
				_id: true
			}
		}),
		includeSuspended ? (User.find({
			isSuspended: true
		}, {
			fields: {
				_id: true
			}
		})) : [],
		includeSilenced ? (User.find({
			isSilenced: true,
			_id: { $nin: meId ? [ meId ] : [] }
		}, {
			fields: {
				_id: true
			}
		})) : [],
		meId ? Mute.find({
			$or: [
				{ expiresAt: null },
				{ expiresAt: { $gt: new Date() }}
			],
			...(allowNotification ? { notification: { $ne: true } } : {}),
			muterId: meId
		}) : [],
		meId ? Blocking.find({
			blockerId: meId
		}) : [],
		meId ? Blocking.find({
			blockeeId: meId
		}) : [],
	]);

	return unique(
		deleted.map(user => user._id)
		.concat(suspended.map(user => user._id))
		.concat(silenced.map(user => user._id))
		.concat(muted.map(mute => mute.muteeId)))
		.concat(blocking.map(block => block.blockeeId))
		.concat(blocked.map(block => block.blockerId));
}
