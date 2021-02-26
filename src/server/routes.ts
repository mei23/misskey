
import * as Fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import favicon from 'fastify-favicon';
import pointOfView from 'point-of-view';

const httpSignature = require('http-signature');
import * as path from 'path';
import * as pug from 'pug';
import cors from 'fastify-cors';
import fetchMeta from '../misc/fetch-meta';
import { buildMeta } from '../misc/build-meta';
import { fromHtml } from '../mfm/from-html';
import config from '../config';
import { sendBase } from './h';
import api from './api';
import urlPreview from './web/url-preview';
const htmlescape = require('htmlescape');

export default async (server: Fastify.FastifyInstance, opts: Fastify.FastifyPluginOptions, done: (err?: Error) => void) => {
	const client = `${__dirname}/../client/`;	// built/client

	console.log(client);
	server.register(fastifyStatic, {
		root: `${client}/assets`,
		prefix: '/assets/',
		maxAge: 1 * 86400 * 1000,
	});

	server.register(favicon, { path: `${client}/assets` });

	server.get('/apple-touch-icon.png', async (request, reply) => {
		reply.sendFile('apple-touch-icon.png');
	});

	server.get('/robots.txt', async (request, reply) => {
		reply.sendFile('robots.txt');
	});

	server.get('/url', urlPreview);

	server.register(pointOfView, {
		engine: {
			pug: pug
		},
		root: path.join(__dirname, '../../src/server/web/views'),
		viewExt: 'pug'
	});




	server.register(api, {
		prefix: '/api'
	});

	server.get('/', sendBase);

	done();
};
