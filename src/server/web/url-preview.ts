import * as Fastify from 'fastify'
import { getJson } from '../../misc/fetch';
import summaly from '../../misc/summaly';
import fetchMeta from '../../misc/fetch-meta';
import Logger from '../../services/logger';
import config from '../../config';
import { query } from '../../prelude/url';

const logger = new Logger('url-preview');

interface IQueryString {
	/** URL to preview */
	url?: string;
	/** User language */
	lang?: string;
}

export default async (request: Fastify.FastifyRequest<{ Querystring: IQueryString }>, reply: Fastify.FastifyReply) => {
	if (config.disableUrlPreview || !request.query.url) {
		reply.send({});
		return;
	}
	const meta = await fetchMeta();

	logger.info(meta.summalyProxy
		? `(Proxy) Getting preview of ${request.query.url}@${request.query.lang} ...`
		: `Getting preview of ${request.query.url}@${request.query.lang} ...`);

	try {
		const summary = meta.summalyProxy ? await getJson(`${meta.summalyProxy}?${query({
			url: request.query.url,
			lang: request.query.lang || 'ja-JP'
		})}`) : await summaly(request.query.url);

		logger.succ(`Got preview of ${request.query.url}: ${summary.title}`);

		summary.icon = wrap(summary.icon);
		summary.thumbnail = wrap(summary.thumbnail);

		// Cache 7days
		reply
			.header('Cache-Control', 'max-age=604800')
			.send(summary);
	} catch (e) {
		logger.error(`Failed to get preview of ${request.query.url}: ${e}`);
		reply
			.header('Cache-Control', 'max-age=3600')
			.send({});
	}
};

function wrap(url: string): string | null {
	return url != null
		? url.match(/^https?:\/\//)
			? `${config.url}/proxy/preview.jpg?${query({
				url,
				preview: '1'
			})}`
			: url
		: null;
}
