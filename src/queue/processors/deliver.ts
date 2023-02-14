import * as Bull from 'bull';
import request from '../../remote/activitypub/request';
import { registerOrFetchInstanceDoc } from '../../services/register-or-fetch-instance-doc';
import Instance from '../../models/instance';
import instanceChart from '../../services/chart/instance';
import Logger from '../../services/logger';
import { UpdateInstanceinfo } from '../../services/update-instanceinfo';
import { isBlockedHost, isClosedHost, isSelfSilencedHost } from '../../services/instance-moderation';
import { DeliverJobData, ThinUser } from '../types';
import { publishInstanceModUpdated } from '../../services/server-event';
import { StatusError } from '../../misc/fetch';
import config from '../../config';

const logger = new Logger('deliver');

export default async (job: Bull.Job<DeliverJobData>) => {
	if (!job.data.to?.match(/^https?:/)) {
		return 'skip (invalid URL)';
	}

	const { host } = new URL(job.data.to);

	// ブロック/閉鎖してたら中断
	if (await isBlockedHost(host)) {
		return 'skip (blocked)';
	}
	if (await isClosedHost(host)) {
		return 'skip (closed)';
	}

	if (await isSelfSilencedHost(host)) {
		job.data.content = publicToHome(job.data.content, job.data.user);
	}

	try {
		const res = await request(job.data.user, job.data.to, job.data.content);

		// Update stats
		registerOrFetchInstanceDoc(host).then(i => {
			Instance.update({ _id: i._id }, {
				$set: {
					latestRequestSentAt: new Date(),
					latestStatus: 200,
					lastCommunicatedAt: new Date(),
					isNotResponding: false
				}
			});

			UpdateInstanceinfo(i);

			instanceChart.requestSent(i.host, true);
		});

		return `ok: ${res?.substring(0, 256)}`;
	} catch (res) {
		// Update stats
		registerOrFetchInstanceDoc(host).then(i => {
			Instance.update({ _id: i._id }, {
				$set: {
					latestRequestSentAt: new Date(),
					latestStatus: res instanceof StatusError ? res.statusCode : null,
					isNotResponding: true
				}
			});

			instanceChart.requestSent(i.host, false);
		});

		if (res instanceof StatusError) {
			// 4xx
			if (res.isClientError) {
				// Mastodonから返ってくる401がどうもpermanent errorじゃなさそう
				if (res.statusCode === 401) {
					throw `${res.statusCode} ${res.statusMessage}`;
				}

				// sharedInboxで410を返されたら閉鎖済みとマークする
				if (res.statusCode === 410 && job.data.inboxInfo?.origin === 'sharedInbox') {
					logger.info(`${host}: MarkedAsClosed (sharedInbox:410)`);
					registerOrFetchInstanceDoc(host).then(i => {
						Instance.update({ _id: i._id }, {
							$set: {
								isMarkedAsClosed: true
							}
						}).then(() => {
							publishInstanceModUpdated();
						})
					});
				}

				// HTTPステータスコード4xxはクライアントエラーであり、それはつまり
				// 何回再送しても成功することはないということなのでエラーにはしないでおく
				return `${res.statusCode} ${res.statusMessage}`;
			}
		}

		throw res;
	}
};

type DeliverContent = {
	type: string;
	to: string[];
	cc: string[];
	object: {
		type: string;
		to: string[];
		cc: string[];
	};
};

function publicToHome(content: DeliverContent, user: ThinUser): DeliverContent {
	if (content.type === 'Create' && content.object.type === 'Note') {
		const asPublic = 'https://www.w3.org/ns/activitystreams#Public';
		const followers = `${config.url}/users/${user._id}/followers`;

		if (content.to.includes(asPublic)) {
			content.to = content.to.filter(x => x !== asPublic);
			content.to = content.to.concat(followers);
			content.cc = content.cc.filter(x => x !== followers);
			content.cc = content.cc.concat(asPublic);
		}

		if (content.object.to.includes(asPublic)) {
			content.object.to = content.object.to.filter(x => x !== asPublic);
			content.object.to = content.object.to.concat(followers);
			content.object.cc = content.object.cc.filter(x => x !== followers);
			content.object.cc = content.object.cc.concat(asPublic);
		}

		return content;
	} else {
		return content;
	}
}
