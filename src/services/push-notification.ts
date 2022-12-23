import * as mongo from 'mongodb';
import Subscription from '../models/sw-subscription';
import User, { getPushNotificationsValue, isLocalUser } from '../models/user';
import { webpushDeliver } from '../queue';

/*
let meta: IMeta | null = null;

function update() {
	fetchMeta().then(m => {
		meta = m;

		if (meta.enableServiceWorker) {
			// アプリケーションの連絡先と、サーバーサイドの鍵ペアの情報を登録
			push.setVapidDetails(config.url,
				meta.swPublicKey,
				meta.swPrivateKey);
		}
	});
}

setInterval(() => {
	update();
}, 30000);

update();
*/

export default async function(userId: mongo.ObjectID | string, type: string, body?: any) {
	//if (!meta?.enableServiceWorker) return;

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

		webpushDeliver({
			swSubscriptionId: subscription._id,
			pushSubscription,
			payload: JSON.stringify(payload),
		});
	}
}
