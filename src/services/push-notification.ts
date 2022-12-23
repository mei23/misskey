import * as mongo from 'mongodb';
import fetchMeta from '../misc/fetch-meta';
import Subscription from '../models/sw-subscription';
import User, { getPushNotificationsValue, isLocalUser } from '../models/user';
import { webpushDeliver } from '../queue';

let swEnabled = false;

function update() {
	fetchMeta().then(meta => {
		if (meta.enableServiceWorker && meta.swPublicKey && meta.swPrivateKey) {
			swEnabled = true;
		} else {
			swEnabled = false;
		}
	});
}

setInterval(() => { update() }, 30000);
update();

export default async function(userId: mongo.ObjectID | string, type: string, body?: any) {
	if (!swEnabled) return;

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
