import renderDelete from '../remote/activitypub/renderer/delete';
import renderUndo from '../remote/activitypub/renderer/undo';
import { renderActivity } from '../remote/activitypub/renderer';
import { deliver } from '../queue';
import config from '../config';
import { IUser, isLocalUser } from '../models/user';
import Following from '../models/following';

export async function doPostUnsuspend(user: IUser) {
	if (isLocalUser(user)) {
		// 知り得る全SharedInboxにUndo Delete配信
		const content = renderActivity(renderUndo(renderDelete(`${config.url}/users/${user._id}`, user), user));

		const results = await Following.aggregate([
			{
				$match: {
					$or: [
						{ '_follower.sharedInbox': { $ne: null } },
						{ '_followee.sharedInbox': { $ne: null } }
					]
				}
			},
			{
				$project: {
					sharedInbox: {
						$setUnion: [['$_follower.sharedInbox'], ['$_followee.sharedInbox']]
					}
				}
			},
			{
				$unwind: '$sharedInbox'
			},
			{
				$match: {
					sharedInbox: { $ne: null }
				}
			},
			{
				$group: {
					_id: '$sharedInbox',
				}
			}
		]) as { _id: string }[];

		const inboxes = results.map(x => x._id);

		for (const inbox of inboxes) {
			deliver(user as any, content, inbox);
		}
	}
}
