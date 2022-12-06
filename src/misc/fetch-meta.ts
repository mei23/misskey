import Meta, { IMeta } from '../models/meta';

const defaultMeta: any = {
	name: 'Misskey',
	maintainer: {},
	langs: [],
	cacheRemoteFiles: false,
	localDriveCapacityMb: 256,
	remoteDriveCapacityMb: 8,
	hidedTags: [],
	blockedInstances: [],
	stats: {
		// Object.assignじゃマージされない
	},
	maxNoteTextLength: 1000,
	enableEmojiReaction: true,
	enableTwitterIntegration: false,
	enableGithubIntegration: false,
	enableDiscordIntegration: false,
	mascotImageUrl: '/assets/ai.png',
	enableServiceWorker: false
};

export default async function(): Promise<IMeta> {
	const meta = await Meta.findOne({});

	return Object.assign({}, defaultMeta, meta);
}
