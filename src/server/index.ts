/**
 * Core Server
 */

import * as fs from 'fs';
import * as http from 'http';
import * as http2 from 'http2';
import * as https from 'https';
import * as Koa from 'koa';
import * as Router from '@koa/router';
import * as mount from 'koa-mount';
import * as koaLogger from 'koa-logger';
import * as requestStats from 'request-stats';
import * as slow from 'koa-slow';

import activityPub from './activitypub';
import nodeinfo from './nodeinfo';
import wellKnown from './well-known';
import config from '../config';
import networkChart from '../services/chart/network';
import apiServer from './api';
import { sum } from '../prelude/array';
import User from '../models/user';
import Logger from '../services/logger';
import { program } from '../argv';
import routes from './routes';

import * as Fastify from 'fastify';
import fastifySensible from 'fastify-sensible';
import fastifyCookie from 'fastify-cookie';

import fastifyStatic from 'fastify-static';
import pointOfView from 'point-of-view';
import * as path from 'path';
import * as pug from 'pug';
import cors from 'fastify-cors';

export const serverLogger = new Logger('server', 'gray', false);

const server = Fastify.fastify({
	logger: !['production', 'test'].includes(process.env.NODE_ENV || 'development'),
	trustProxy: [
		'127.0.0.0/8', '10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16',
		'::1', 'fc00::/7'
	],
	exposeHeadRoutes: true,
});

server.register(fastifySensible);

// JSON inputとみなすContent-Type
server.addContentTypeParser('application/activity+json', { parseAs: 'string' }, (server as any).getDefaultJsonParser('ignore', 'ignore'));
server.addContentTypeParser('application/ld+json', { parseAs: 'string' }, (server as any).getDefaultJsonParser('ignore', 'ignore'));

// HSTS
// 6months (15552000sec)
if (config.url.startsWith('https') && !config.disableHsts) {
	server.addHook('onRequest', async (request, reply) => {
		reply.header('strict-transport-security', 'max-age=15552000; preload');
	});
}

server.register(routes);

export default (): Promise<void> => new Promise<void>((resolve, reject) => {
	server.listen(config.port, '0.0.0.0', (err, address) => {
		if (err) {
			reject(err);
		}
		resolve();
	});
});

// For testing
/*
export const startServer = () => {
	const server = createServer();

	// Init stream server
	require('./api/streaming')(server);

	// Listen
	server.listen(config.port);

	return server;
};
*/







/*


app.use(mount('/api', apiServer as any));
app.use(mount('/files', require('./file')));
app.use(mount('/proxy', require('./proxy')));

// Init router
const router = new Router();

// Routing
router.use(activityPub.routes());
router.use(nodeinfo.routes());
router.use(wellKnown.routes());

router.get('/verify-email/:code', async ctx => {
	const user = await User.findOne({ emailVerifyCode: ctx.params.code });

	if (user != null) {
		ctx.body = 'Verify succeeded!';
		ctx.status = 200;

		User.update({ _id: user._id }, {
			$set: {
				emailVerified: true,
				emailVerifyCode: null
			}
		});
	} else {
		ctx.status = 404;
	}
});

// Register router
app.use(router.routes());

app.use(mount(require('./web')));

function createServer() {
	if (config.https) {
		const certs: any = {};
		for (const k of Object.keys(config.https)) {
			certs[k] = fs.readFileSync(config.https[k]);
		}
		certs['allowHTTP1'] = true;
		return http2.createSecureServer(certs, app.callback()) as https.Server;
	} else {
		return http.createServer(app.callback());
	}
}



export default () => new Promise(resolve => {
	const server = createServer();

	// Init stream server
	require('./api/streaming')(server);

	// Listen
	server.listen(config.port, resolve);

	//#region Network stats
	let queue: any[] = [];

	requestStats(server, (stats: any) => {
		if (stats.ok) {
			queue.push(stats);
		}
	});

	// Bulk write
	setInterval(() => {
		if (queue.length == 0) return;

		const requests = queue.length;
		const time = sum(queue.map(x => x.time));
		const incomingBytes = sum(queue.map(x => x.req.byets));
		const outgoingBytes = sum(queue.map(x => x.res.byets));
		queue = [];

		networkChart.update(requests, time, incomingBytes, outgoingBytes);
	}, 5000);
	//#endregion
});
*/
