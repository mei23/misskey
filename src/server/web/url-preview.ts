import * as tmp from 'tmp';
import * as fs from 'fs';
import * as Router from '@koa/router';
import { getJson } from '../../misc/fetch';
import { Summary } from 'summaly';
import fetchMeta from '../../misc/fetch-meta';
import Logger from '../../services/logger';
import config from '../../config';
import { query } from '../../prelude/url';
import { downloadUrl } from '../../misc/download-url';
import { detectImageSize } from '../../misc/get-file-info';
import { convertToWebp } from '../../services/drive/image-processor';
import { sanitizeUrl } from '../../misc/sanitize-url';

const logger = new Logger('url-preview');

//#region SummaryInstance
let summaryInstance: Summary | null = null;

function getSummaryInstance(): Summary {
	if (summaryInstance) return summaryInstance;
	summaryInstance = new Summary({
		allowedPlugins: [
			'twitter',
			'youtube',
			'dlsite',
		],
	});
	return summaryInstance;
}
//#endregion

module.exports = async (ctx: Router.RouterContext) => {
	if (config.disableUrlPreview) {
		ctx.status = 403;
		ctx.set('Cache-Control', 'max-age=3600');
		return;
	}

	const meta = await fetchMeta();

	const url = sanitizeUrl(ctx.query.url);
	if (url == null) {
		ctx.status = 400;
		ctx.set('Cache-Control', 'max-age=3600');
		return;
	}

	const lang = ctx.query.lang || 'ja-JP';

	logger.info(meta.summalyProxy
		? `(Proxy) Getting preview of ${url}@${lang} ...`
		: `Getting preview of ${url}@${lang} ...`);

	try {
		const summary = meta.summalyProxy ? await getJson(`${meta.summalyProxy}?${query({
			url: url,
			lang: lang
		})}`) : await getSummaryInstance().summary(url, {
			lang: lang
		});

		logger.succ(`Got preview of ${url}: ${summary.title}`);

		summary.icon = await wrap(summary.icon, 32);
		summary.thumbnail = await wrap(summary.thumbnail, 128);

		if (summary.player) summary.player.url = sanitizeUrl(summary.player.url);
		summary.url = sanitizeUrl(summary.url);

		if (summary.player?.url?.startsWith('https://player.twitch.tv/')) {
			summary.player.url = summary.player.url.replace('parent=meta.tag', `parent=${config.url.replace(/^https?:[/][/]/, '')}`);
		}

		// Cache 7days
		ctx.set('Cache-Control', 'max-age=604800');

		ctx.body = summary;
	} catch (e) {
		logger.error(`Failed to get preview of ${url}: ${e}`);
		ctx.status = 200;

		ctx.set('Cache-Control', 'max-age=3600');
		ctx.body = {};
	}
};

async function wrap(url: string | null, size = 128): Promise<string | null> {
	if (url == null) return null;

	if (url.match(/^https?:/)) {
		return await convertDataUri(url, size);
	}

	if (url.match(/^data:/)) {
		return url;
	}

	return null;
}

async function convertDataUri(url: string | null | undefined, size = 128): Promise<string | null> {
	if (url == null) return null;

	const [path, cleanup] = await new Promise<[string, any]>((res, rej) => {
		tmp.file((e, path, fd, cleanup) => {
			if (e) return rej(e);
			res([path, cleanup]);
		});
	});

	try {
		await downloadUrl(url, path);

		const imageSize = await detectImageSize(path);

		if (!imageSize) return null;
		if (imageSize.wUnits === 'px' && (imageSize.width > 16383 || imageSize.height > 16383)) return null;

		if (['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'].includes(imageSize.mime)) {
			const image = await convertToWebp(path, size, size);
			return `data:image/webp;base64,${image.data.toString('base64')}`;
		}

		if (['image/x-icon'].includes(imageSize.mime)) {
			return `data:image/x-icon;base64,${(await fs.promises.readFile(path)).toString('base64')}`;
		}

		return null;
	} catch (e) {
		return null;
	} finally {
		cleanup();
	}
}
