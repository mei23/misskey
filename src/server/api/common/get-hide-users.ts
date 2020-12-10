import * as mongo from 'mongodb';
import Mute from '../../../models/mute';
import User, { IUser } from '../../../models/user';
import { unique } from '../../../prelude/array';
import Blocking from '../../../models/blocking';

export async function getHideUserIds(me: IUser | null, includeSilenced = true, includeSuspended = true) {
	return await getHideUserIdsById(me ? me._id : null, includeSilenced, includeSuspended);
}

export async function getHideUserIdsById(meId?: mongo.ObjectID | null, includeSilenced = true, includeSuspended = true) {
	const [suspended, silenced, muted, blocking, blocked] = await Promise.all([
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
			muterId: meId
		}) : [],
		meId ? Blocking.find({
			blockerId: meId
		}) : [],
		meId ? Blocking.find({
			blockeeId: meId
		}) : [],
	]);

	return unique(suspended.map(user => user._id)
		.concat(silenced.map(user => user._id))
		.concat(muted.map(mute => mute.muteeId)))
		.concat(blocking.map(block => block.blockeeId))
		.concat(blocked.map(block => block.blockerId));
}
