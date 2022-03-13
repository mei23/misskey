import * as push from 'web-push';
import * as mongo from 'mongodb';
import Subscription from '../models/sw-subscription';
import config from '../config';
import fetchMeta from '../misc/fetch-meta';
import { IMeta } from '../models/meta';
import User, { getPushNotificationsValue, isLocalUser } from '../models/user';

let meta: IMeta = null;

setInterval(() => {
	fetchMeta().then(m => {
		meta = m;

		if (meta.enableServiceWorker) {
			// アプリケーションの連絡先と、サーバーサイドの鍵ペアの情報を登録
			push.setVapidDetails(config.url,
				meta.swPublicKey,
				meta.swPrivateKey);
		}
	});
}, 30000);

export default async function(userId: mongo.ObjectID | string, type: string, body?: any) {
	if (!meta.enableServiceWorker) return;

	if (typeof userId === 'string') {
		userId = new mongo.ObjectID(userId) as mongo.ObjectID;
	}

	const user = await User.findOne({
		_id: userId
	});

	if (user == null || !isLocalUser(user)) return;

	if (body?.type) {
		const enabled = getPushNotificationsValue(user.settings?.pushNotifications, body.type);
		if (!enabled) return;
	}

	// Fetch
	const subscriptions = await Subscription.find({
		userId: userId
	});

	for (const subscription of subscriptions) {
		const pushSubscription = {
			endpoint: subscription.endpoint,
			keys: {
				auth: subscription.auth,
				p256dh: subscription.publickey
			}
		};

		const payload = {
			type, body
		};

		push.sendNotification(pushSubscription, JSON.stringify(payload), {
			proxy: config.proxy
		}).catch((err: any) => {
			//swLogger.info(err.statusCode);
			//swLogger.info(err.headers);
			//swLogger.info(err.body);

			if (err.statusCode == 410) {
				Subscription.remove({
					userId: userId,
					endpoint: subscription.endpoint,
					auth: subscription.auth,
					publickey: subscription.publickey
				});
			}
		});
	}
}
