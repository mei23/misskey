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

		const queue: string[] = [];

		const followings = await Following.find({
			$or: [
				{ '_follower.sharedInbox': { $ne: null } },
				{ '_followee.sharedInbox': { $ne: null } },
			]
		}, {
			'_follower.sharedInbox': 1,
			'_followee.sharedInbox': 1,
		});

		const inboxes = followings.map(x => x._follower.sharedInbox || x._followee.sharedInbox);

		for (const inbox of inboxes) {
			if (inbox != null && !queue.includes(inbox)) queue.push(inbox);
		}

		for (const inbox of queue) {
			deliver(user as any, content, inbox);
		}
	}
}
