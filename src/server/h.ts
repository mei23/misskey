
import * as Fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import pointOfView from 'point-of-view';
const httpSignature = require('http-signature');
import * as path from 'path';
import * as pug from 'pug';
import cors from 'fastify-cors';
import fetchMeta from '../misc/fetch-meta';
import { buildMeta } from '../misc/build-meta';
import { fromHtml } from '../mfm/from-html';
import config from '../config';
const htmlescape = require('htmlescape');

export const sendBase = async (request: Fastify.FastifyRequest, reply: Fastify.FastifyReply) => {
		const meta = await fetchMeta();
		const builded = await buildMeta(meta, false);

		let desc = meta.description;
		try {
			desc = fromHtml(desc || '') || undefined;
		} catch { }

		const noindex = request.url.match(/^[/](search|tags[/]|explore|featured)/);

		reply
			.header('Cache-Control', 'public, max-age=300')
			.view('base', {
				initialMeta: htmlescape(builded),
				img: meta.bannerUrl,
				title: meta.name || 'Misskey',
				instanceName: meta.name || 'Misskey',
				desc,
				icon: config.icons?.favicon?.url,
				iconType: config.icons?.favicon?.type,
				appleTouchIcon: config.icons?.appleTouchIcon?.url,
				noindex
			});
};

