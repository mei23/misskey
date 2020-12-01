/* eslint-disable no-async-promise-executor */
import * as mongo from 'mongodb';
import Notification from '../models/notification';
import { pack } from '../models/notification';
import { publishMainStream } from './stream';
import User, { getMute } from '../models/user';
import pushSw from './push-notification';

export const createNotification = (
	notifiee: mongo.ObjectID,
	notifier: mongo.ObjectID,
	type: string,
	content?: any
) => new Promise<any>(async (resolve, reject) => {
	try {
		if (notifiee.equals(notifier)) {
			return resolve();
		}
	} catch (e) {
		return reject(e);
	}

	// Create notification
	const notification = await Notification.insert(Object.assign({
		createdAt: new Date(),
		notifieeId: notifiee,
		notifierId: notifier,
		type: type,
		isRead: false
	}, content));

	resolve(notification);

	const packed = await pack(notification);

	// Publish notification event
	publishMainStream(notifiee, 'notification', packed);

	// 2秒経っても(今回作成した)通知が既読にならなかったら「未読の通知がありますよ」イベントを発行する
	setTimeout(async () => {
		const fresh = await Notification.findOne({ _id: notification._id }, { isRead: true });
		if (!fresh.isRead) {
			//#region ただしミュートしているユーザーからの通知なら無視
			const mute = await getMute(notifiee, notifier);
			if (mute) return;
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
});
