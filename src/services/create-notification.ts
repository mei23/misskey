/* eslint-disable no-async-promise-executor */
import { ObjectID } from 'mongodb';
import Notification, { INotification } from '../models/notification';
import { pack } from '../models/notification';
import { publishMainStream } from './stream';
import User, { getBlocks, getMute } from '../models/user';
import pushSw from './push-notification';


export async function createNotification(notifiee: ObjectID, notifier: ObjectID, type: 'poll_finished' | 'reply' | 'renote' | 'quote' | 'mention' | 'highlight', content: { noteId: ObjectID }): Promise<INotification | undefined>;
export async function createNotification(notifiee: ObjectID, notifier: ObjectID, type: 'unreadMessagingMessage', content: { messageId: ObjectID }): Promise<INotification | undefined>;
export async function createNotification(notifiee: ObjectID, notifier: ObjectID, type: 'poll_vote', content: { noteId: ObjectID, choice: number }): Promise<INotification | undefined>;
export async function createNotification(notifiee: ObjectID, notifier: ObjectID, type: 'reaction', content: { noteId: ObjectID, reaction?: string }): Promise<INotification | undefined>;
export async function createNotification(notifiee: ObjectID, notifier: ObjectID, type: 'follow'): Promise<INotification | undefined>;
export async function createNotification(notifiee: ObjectID, notifier: ObjectID, type: 'receiveFollowRequest'): Promise<INotification | undefined>;
export async function createNotification(notifiee: ObjectID, notifier: ObjectID, type: string, content?: any): Promise<INotification | undefined> {
	if (notifiee.equals(notifier)) return

	// Create notification
	const notification = await Notification.insert(Object.assign({
		createdAt: new Date(),
		notifieeId: notifiee,
		notifierId: notifier,
		type: type,
		isRead: false
	}, content));

	// post process
	(async () => {
		const packed = await pack(notification);

		// Publish notification event
		publishMainStream(notifiee, 'notification', packed);

		// 2秒経っても(今回作成した)通知が既読にならなかったら「未読の通知がありますよ」イベントを発行する
		setTimeout(async () => {
			const fresh = await Notification.findOne({ _id: notification._id }, { isRead: true });
			if (fresh == null) return;
			if (!fresh.isRead) {
				//#region ただしミュートしているユーザーからの通知なら無視
				const mute = await getMute(notifiee, notifier);
				if (mute) return;
				const blocks = await getBlocks(notifiee, notifier);
				if (blocks.length > 0) return;
				//#endregion

				// Update flag
				User.update({ _id: notifiee }, {
					$set: {
						hasUnreadNotification: true
					}
				});

				publishMainStream(notifiee, 'unreadNotification', packed);

				pushSw(notifiee, 'notification', packed);
			}
		}, 2000);

	})();

	return notification;
}
