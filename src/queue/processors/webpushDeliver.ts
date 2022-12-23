import * as Bull from 'bull';
import * as mongo from 'mongodb';
import { WebpushDeliverJobData } from '../types';

import fetchMeta from '../../misc/fetch-meta';
import * as webpush from 'web-push';
import config from '../../config';
import SwSubscription from '../../models/sw-subscription';

let enabled = false;

function update() {
	fetchMeta().then(meta => {
		if (meta.enableServiceWorker && meta.swPublicKey && meta.swPrivateKey) {
			enabled = true;
			// アプリケーションの連絡先と、サーバーサイドの鍵ペアの情報を登録
			webpush.setVapidDetails(config.url, meta.swPublicKey, meta.swPrivateKey);
		} else {
			enabled = false;
		}
	});
}

setInterval(() => { update() }, 30000);
update();

export default async (job: Bull.Job<WebpushDeliverJobData>): Promise<string> => {
	if (!enabled) return 'skip (not enabled)';

	await webpush.sendNotification(job.data.pushSubscription, job.data.payload, {
		proxy: config.proxy
	}).catch(async (err: unknown) => {
		if (err instanceof webpush.WebPushError) {
			if (err.statusCode === 410) {
				await SwSubscription.remove({
					_id: new mongo.ObjectID(job.data.swSubscriptionId)
				});
			}

			const msg = `${err.statusCode} ${job.data.pushSubscription.endpoint}`;

			// 4xx => no retry, other => retry
			if (err.statusCode >= 400 && err.statusCode <= 499) {
				return `skip (${msg})`;
			} else {
				throw new Error(msg);
			}
		} else {
			throw err;
		}
	});

	return `ok`;
}
