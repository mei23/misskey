import * as Router from '@koa/router';
import config from '../config';
import fetchMeta from '../misc/fetch-meta';
import User from '../models/user';
//import Note from '../models/note';
import { repositoryUrl } from '../const.json';
import Relay from '../models/relay';
import { fromHtml } from '../mfm/from-html';

const router = new Router();

const nodeinfo2_1path = '/nodeinfo/2.1';
const nodeinfo2_0path = '/nodeinfo/2.0';

export const links = [/* (awaiting release) {
	rel: 'http://nodeinfo.diaspora.software/ns/schema/2.1',
	href: config.url + nodeinfo2_1path
}, */{
	rel: 'http://nodeinfo.diaspora.software/ns/schema/2.0',
	href: config.url + nodeinfo2_0path
}];

const nodeinfo2 = async () => {
	const meta = await fetchMeta();

	//const total = await User.count({ host: null });
	//const activeHalfyear = await User.count({ host: null, updatedAt: { $gt: new Date(Date.now() - 15552000000) } });
	//const activeMonth = await User.count({ host: null, updatedAt: { $gt: new Date(Date.now() - 2592000000) } });
	//const localPosts = await Note.count({ '_user.host': null, replyId: null });
	//const localComments = await Note.count({ '_user.host': null, replyId: { $ne: null } });

	const relayActor = await User.findOne({ host: null, username: 'relay.actor' });

	const relays = await Relay.find({ status: 'accepted' });
	const relayedHosts = relays.map(x => {
		try {
			return new URL(x.inbox).hostname;
		} catch {
			return null;
		}
	}).filter((x): x is string => x != null);

	const nodeName = meta.name || 'Misskey';
	const nodeDescription = fromHtml(meta.description || '');

	return {
		software: {
			name: 'misskey',
			version: config.version,
			repository: `${repositoryUrl}`,
		},
		protocols: ['activitypub'],
		services: {
			inbound: [] as string[],
			outbound: ['atom1.0', 'rss2.0']
		},
		openRegistrations: !meta.disableRegistration,
		usage: {
		},
		metadata: {
			nodeName,
			nodeDescription,
			name: nodeName,
			description: nodeDescription,
			maintainer: meta.maintainer,
			langs: meta.langs,
			announcements: meta.announcements,
			relayActor: relayActor ? `${config.url}/users/${relayActor._id}` : null,
			relays: relayedHosts,
			disableRegistration: meta.disableRegistration,
			disableLocalTimeline: meta.disableLocalTimeline,
			disableGlobalTimeline: meta.disableGlobalTimeline,
			enableRecaptcha: meta.enableRecaptcha,
			maxNoteTextLength: meta.maxNoteTextLength,
			enableTwitterIntegration: meta.enableTwitterIntegration,
			enableGithubIntegration: meta.enableGithubIntegration,
			enableDiscordIntegration: meta.enableDiscordIntegration,
			enableEmail: meta.enableEmail,
			enableServiceWorker: meta.enableServiceWorker,
			proxyAccountName: meta.proxyAccount || null,
		}
	};
};

router.get(nodeinfo2_1path, async ctx => {
	if (config.disableFederation) ctx.throw(404);

	const base = await nodeinfo2();

	ctx.body = { version: '2.1', ...base };
	ctx.set('Cache-Control', 'public, max-age=600');
});

router.get(nodeinfo2_0path, async ctx => {
	if (config.disableFederation) ctx.throw(404);

	const base = await nodeinfo2();

	delete base.software.repository;

	ctx.body = { version: '2.0', ...base };
	ctx.set('Cache-Control', 'public, max-age=600');
});

export default router;
