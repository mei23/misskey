import * as http from 'http';
import * as WebSocket from 'ws';
import { createConnection } from '../../db/redis';
import Xev from 'xev';

import MainStreamConnection from './stream';
import authenticate, { AuthenticationError } from './authenticate';
import { EventEmitter } from 'events';
import config from '../../config';
import Logger from '../../services/logger';
import activeUsersChart from '../../services/chart/active-users';
import * as querystring from 'querystring';
import { IUser } from '../../models/user';
import { IApp } from '../../models/app';
import rndstr from 'rndstr';

export const streamLogger = new Logger('stream', 'cyan');

type ClientInfo = {
	user: IUser | null | undefined;
	app: IApp | null | undefined;
};

module.exports = (server: http.Server) => {
	const wss = new WebSocket.WebSocketServer({ noServer: true });

	// 1. 認証
	server.on('upgrade', async (request, socket, head) => {
		// Auth
		try {
			const [user, app] = await auth(request);

			if (user?.isSuspended) {
				socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
				socket.destroy();
				return;
			}

			if (user?.isDeleted) {
				socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
				socket.destroy();
				return;
			}

			wss.handleUpgrade(request, socket, head, (ws) => {
				const client: ClientInfo = { user, app };
				wss.emit('connection', ws, request, client);
			});
		} catch (e: any) {
			if (e instanceof AuthenticationError) {
				socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
				socket.destroy();
				return;
			} else {
				streamLogger.error(e);
				socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
				socket.destroy();
				return;
			}
		}
	});

	// 2. ユーザー認証後はここにくる
	wss.on('connection', (ws: WebSocket.WebSocket, request: http.IncomingMessage, client: ClientInfo) => {
		const userHash = rndstr(8);
		streamLogger.debug(`[${userHash}] connect: user=${client.user?.username}`);

		// init lastActive
		let lastActive = Date.now();
		const updateLastActive = () => {
			streamLogger.debug(`[${userHash}] active`);
			lastActive = Date.now();
			if (client.user) activeUsersChart.update(client.user);
		};
		updateLastActive();

		ws.on('error', e => streamLogger.error(e));

		ws.on('message', data => {
			streamLogger.debug(`[${userHash}] recv ${data}`);
			updateLastActive();

			// implement app layer ping
			if (data.toString() === 'ping') {
				ws.send('pong');
			}
		});

		// handle protocol layer pong from client
		ws.on('pong', () => {
			streamLogger.debug(`[${userHash}] recv pong`);
			updateLastActive();
		});

		// setup events
		let ev: EventEmitter;

		if (config.redis) {
			const redisSubscriber = createConnection();
			redisSubscriber.subscribe(config.host);

			ev = new EventEmitter();

			redisSubscriber.on('message', async (_: any, data: any) => {
				const obj = JSON.parse(data);

				ev.emit(obj.channel, obj.message);
			});

			ws.once('close', (code, reason) => {
				redisSubscriber.unsubscribe();
				redisSubscriber.quit();
			});
		} else {
			ev = new Xev();
		}

		const main = new MainStreamConnection(ws, ev, client.user, client.app);

		ws.once('close', () => {
			streamLogger.debug(`[${userHash}] close`);
			ev.removeAllListeners();
			main.dispose();
			clearInterval(intervalId);
		});

		// maintain connection
		const intervalId = setInterval(() => {
			streamLogger.debug(`[${userHash}] send ping`);
			ws.ping();

			if (Date.now() - lastActive > 30 * 60 * 1000) {
				streamLogger.debug(`[${userHash}] timeout`);
				ws.terminate();
			}
		}, 1 * 60 * 1000);
	});
}

function auth(request: http.IncomingMessage) {
	if (!request.url) throw new Error('request.url is null');

	const qs = request.url.split('?')[1];
	if (!qs) return [null, null];

	const q = querystring.parse(qs);
	if (!q.i) return [null, null];

	return authenticate(q.i as string);
}
