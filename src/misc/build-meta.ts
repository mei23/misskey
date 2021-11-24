import { IMeta } from '../models/meta';
import Emoji from '../models/emoji';
import config from '../config';
import * as os from 'os';

export async function buildMeta(instance: IMeta, detail = true) {
	const emojis = await Emoji.find({ host: null }, {
		sort: {
			category: 1,
			name: 1
		}
	});

	const response: any = {
		maintainer: instance.maintainer,

		version: config.version,

		name: instance.name,
		uri: config.url,
		description: instance.description,
		langs: instance.langs,

		machine: config.hideServerInfo ? 'Unknown' : os.hostname(),
		os: config.hideServerInfo ? 'Unknown' : os.platform(),
		arch: config.hideServerInfo ? 'Unknown' : os.arch(),
		node: config.hideServerInfo ? 'Unknown' : process.version,

		cpu: {
			model: config.hideServerInfo ? 'Unknown' : os.cpus()[0].model,
			cores: config.hideServerInfo ? 'Unknown' : os.cpus().length
		},

		announcements: instance.announcements || [],
		disableRegistration: instance.disableRegistration,
		disableLocalTimeline: instance.disableLocalTimeline,
		disableGlobalTimeline: instance.disableGlobalTimeline,
		showReplayInPublicTimeline: instance.showReplayInPublicTimeline,
		enableEmojiReaction: true,
		driveCapacityPerLocalUserMb: instance.localDriveCapacityMb,
		driveCapacityPerRemoteUserMb: instance.remoteDriveCapacityMb,
		cacheRemoteFiles: instance.cacheRemoteFiles,
		enableRecaptcha: instance.enableRecaptcha,
		recaptchaSiteKey: instance.recaptchaSiteKey,
		swPublickey: instance.swPublicKey,
		mascotImageUrl: instance.mascotImageUrl,
		bannerUrl: instance.bannerUrl,
		iconUrl: instance.iconUrl,
		maxNoteTextLength: instance.maxNoteTextLength,
		emojis: emojis.map(e => {
			const r = {
				aliases: e.aliases,
				name: e.name,
				category: e.category,
				url: e.url,
			} as any;

			if (e.direction) {
				r.direction = e.direction
			}

			return r;
		}),

		enableEmail: instance.enableEmail,

		enableTwitterIntegration: instance.enableTwitterIntegration,
		enableGithubIntegration: instance.enableGithubIntegration,
		enableDiscordIntegration: instance.enableDiscordIntegration,

		enableServiceWorker: instance.enableServiceWorker,

		proxyAccountName: instance.proxyAccount || null,

		minimumAge: config.minimumAge,
	};

	if (detail) {
		response.features = {
			registration: !instance.disableRegistration,
			localTimeLine: !instance.disableLocalTimeline,
			globalTimeLine: !instance.disableGlobalTimeline,
			elasticsearch: config.elasticsearch ? true : false,
			recaptcha: instance.enableRecaptcha,
			objectStorage: config.drive && config.drive.storage === 'minio',
			twitter: instance.enableTwitterIntegration,
			github: instance.enableGithubIntegration,
			discord: instance.enableDiscordIntegration,
			serviceWorker: instance.enableServiceWorker,
		};
	}

	return response;
}
