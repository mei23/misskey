import * as Router from '@koa/router';
import { getJson } from '../../misc/fetch';
import summaly from '../../misc/summaly';
import fetchMeta from '../../misc/fetch-meta';
import Logger from '../../services/logger';
import config from '../../config';
import { query } from '../../prelude/url';

const logger = new Logger('url-preview');

module.exports = async (ctx: Router.RouterContext) => {
	if (config.disableUrlPreview) {
		ctx.body = '{}';
		return;
	}

	const meta = await fetchMeta();

	logger.info(meta.summalyProxy
		? `(Proxy) Getting preview of ${ctx.query.url}@${ctx.query.lang} ...`
		: `Getting preview of ${ctx.query.url}@${ctx.query.lang} ...`);

	try {
		const summary = meta.summalyProxy ? await getJson(`${meta.summalyProxy}?${query({
			url: ctx.query.url,
			lang: ctx.query.lang || 'ja-JP'
		})}`) : await summaly(ctx.query.url);

		logger.succ(`Got preview of ${ctx.query.url}: ${summary.title}`);

		summary.icon = wrap(summary.icon);
		summary.thumbnail = wrap(summary.thumbnail);

		// Cache 7days
		ctx.set('Cache-Control', 'max-age=604800');

		ctx.body = summary;
	} catch (e) {
		logger.error(`Failed to get preview of ${ctx.query.url}: ${e}`);
		ctx.status = 200;

		ctx.set('Cache-Control', 'max-age=3600');

		ctx.body = '{}';
	}
};

function wrap(url: string): string {
	return url != null
		? url.match(/^https?:\/\//)
			? `${config.url}/proxy/preview.jpg?${query({
				url,
				preview: '1'
			})}`
			: url
		: null;
}
