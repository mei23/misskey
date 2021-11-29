import * as http from 'http';
import * as websocket from 'websocket';
import * as redis from 'redis';
import Xev from 'xev';

import MainStreamConnection from './stream';
import { ParsedUrlQuery } from 'querystring';
import authenticate from './authenticate';
import { EventEmitter } from 'events';
import config from '../../config';
import rndstr from 'rndstr';
import Logger from '../../services/logger';
import activeUsersChart from '../../services/chart/active-users';

export const streamLogger = new Logger('stream', 'cyan');

let connCount = 0;

module.exports = (server: http.Server) => {
	// Init websocket server
	const ws = new websocket.server({
		httpServer: server
	});

	ws.on('request', async (request) => {
		const q = request.resourceURL.query as ParsedUrlQuery;
		const [user, app] = await authenticate(q.i as string);

		if (user?.isSuspended || user?.isDeleted) {
			request.reject(400);
			return;
		}

		const connection = request.accept();

		connCount++;
		const connHash = rndstr(8);
		const connPeer = `${connection?.remoteAddress}`;
		const connUser = user ? `${user._id} (${user.username})` : 'anonymous';
		streamLogger.info(`connect ${connHash} (${connPeer} ${connUser} total=${connCount}`);

		let ev: EventEmitter;

		if (config.redis) {
			// Connect to Redis
			const redisSubscriber = redis.createClient(
				config.redis.port,
				config.redis.host,
				{
					password: config.redis.pass
				}
			);

			redisSubscriber.subscribe(config.host);

			ev = new EventEmitter();

			redisSubscriber.on('message', async (_, data) => {
				const obj = JSON.parse(data);

				ev.emit(obj.channel, obj.message);
			});

			connection.once('close', () => {
				redisSubscriber.unsubscribe();
				redisSubscriber.quit();
			});
		} else {
			ev = new Xev();
		}

		const main = new MainStreamConnection(connection, ev, user, app);

		//#region 後方互換性のため
		if (request.resourceURL.pathname !== '/streaming') {
			main.sendMessageToWsOverride = (type: string, payload: any) => {
				if (type == 'channel') {
					type = payload.type;
					payload = payload.body;
				}
				if (type.startsWith('api:')) {
					type = type.replace('api:', 'api-res:');
				}
				connection.send(JSON.stringify({
					type: type,
					body: payload
				}));
			};

			main.connectChannel(Math.random().toString().substr(2, 8), null,
				request.resourceURL.pathname === '/' ? 'homeTimeline' :
				request.resourceURL.pathname === '/local-timeline' ? 'localTimeline' :
				request.resourceURL.pathname === '/hybrid-timeline' ? 'hybridTimeline' :
				request.resourceURL.pathname === '/global-timeline' ? 'globalTimeline' : null);

			if (request.resourceURL.pathname === '/') {
				main.connectChannel(Math.random().toString().substr(2, 8), null, 'main');
			}
		}
		//#endregion 後方互換性のため

		const intervalId = user ? setInterval(() => {
			activeUsersChart.update(user);
		}, 1000 * 60 * 5) : null;

		if (user) activeUsersChart.update(user);

		connection.once('close', () => {
			connCount--;
			if (intervalId) clearInterval(intervalId);
			streamLogger.info(`close ${connHash} (${connPeer} ${connUser}) total=${connCount}`);
			ev.removeAllListeners();
			main.dispose();
		});

		connection.on('message', async (data) => {
			if (data.utf8Data == 'ping') {
				connection.send('pong');
			}
		});
	});	// ws on request
};
