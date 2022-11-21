/**
 * Core Server
 */

import * as http from 'http';
import * as cluster from 'cluster';
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
import { envOption } from '../env';
import parse from '../misc/acct/parse';
import resolveUser from '../remote/resolve-user';
import getDriveFileUrl from '../misc/get-drive-file-url';
import DriveFile from '../models/drive-file';

export const serverLogger = new Logger('server', 'gray', false);

// Init app
const app = new Koa();
app.proxy = true;
(app as any).maxIpsCount = 1;

if (!['production', 'test'].includes(process.env.NODE_ENV || 'development')) {
	// Logger
	app.use(koaLogger(str => {
		serverLogger.info(str);
	}));

	// Delay
	if (envOption.slow) {
		app.use(slow({
			delay: 3000
		}));
	}
}

// HSTS
// 6months (15552000sec)
if (config.url.startsWith('https') && !config.disableHsts) {
	app.use(async (ctx, next) => {
		ctx.set('strict-transport-security', 'max-age=15552000; preload');
		await next();
	});
}

app.use(async (ctx, next) => {
	ctx.set('Permissions-Policy', 'interest-cohort=()');
	ctx.set('X-Content-Type-Options', 'nosniff');
	await next();
});

app.use(mount('/api', apiServer as any));
app.use(mount('/files', require('./file')));
app.use(mount('/proxy', require('./proxy')));

// Init router
const router = new Router();

// Routing
router.use(activityPub.routes());
router.use(nodeinfo.routes());
router.use(wellKnown.routes());

router.get('/avatar/@:acct', async ctx => {
	const { username, host } = parse(ctx.params.acct);
	const user = await resolveUser(username, host);
	const url = user?.avatarId ? getDriveFileUrl(await DriveFile.findOne({ _id: user.avatarId }), true) : null;

	if (url) {
		ctx.set('Cache-Control', 'public, max-age=300');
		ctx.redirect(url);
	} else {
		ctx.set('Cache-Control', 'public, max-age=300');
		ctx.redirect(`${config.driveUrl}/default-avatar.jpg`);
	}
});

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
	return http.createServer(app.callback());
}

// For testing
export const startServer = () => {
	const server = createServer();

	// Init stream server
	require('./api/streaming')(server);

	// Listen
	server.listen(config.port, config.addr || undefined);

	return server;
};

export default () => new Promise<void>(resolve => {
	const server = createServer();

	// Init stream server
	require('./api/streaming')(server);

	server.on('error', e => {
		switch ((e as any).code) {
			case 'EACCES':
				serverLogger.error(`You do not have permission to listen on port ${config.port}.`);
				break;
			case 'EADDRINUSE':
				serverLogger.error(`Port ${config.port} is already in use by another process.`);
				break;
			default:
				serverLogger.error(e);
				break;
		}

		if (cluster.isWorker) {
			process.send!('listenFailed');
		} else {
			// disableClustering
			process.exit(1);
		}
	});

	// Listen
	server.listen({
		port: config.port,
		host: config.addr || undefined
	}, resolve);

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
