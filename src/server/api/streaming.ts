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

export const streamLogger = new Logger('stream', 'cyan');

module.exports = (server: http.Server) => {
	const wss = new WebSocket.WebSocketServer({ noServer: true });

	// 2. ユーザー認証後はここにくる
	wss.on('connection', (ws: WebSocket.WebSocket, request: http.IncomingMessage, user: IUser | null, app: IApp | null) => {
		streamLogger.debug(`connect: user=${user?.username}`);

		ws.on('error', e => streamLogger.error(e));

		ws.on('message', data => {
			streamLogger.debug(`recv ${data}`);
			if (data.toString() === 'ping') {
				ws.send('pong');
			}
		});

		// events
		let ev: EventEmitter;

		if (config.redis) {
			const redisSubscriber = createConnection();
			redisSubscriber.subscribe(config.host);

			ev = new EventEmitter();

			redisSubscriber.on('message', async (_, data) => {
				const obj = JSON.parse(data);

				ev.emit(obj.channel, obj.message);
			});

			ws.once('close', (code, reason) => {
				streamLogger.debug(`close ${code}`);
				redisSubscriber.unsubscribe();
				redisSubscriber.quit();
			});
		} else {
			ev = new Xev();
		}

		const main = new MainStreamConnection(ws, ev, user, app);

		ws.once('close', () => {
			ev.removeAllListeners();
			main.dispose();
		});
	});

	// 1. 認証
	server.on('upgrade', async (request, socket, head) => {
		function onSocketError(e: any) {
			streamLogger.error(e);
		}

		socket.on('error', onSocketError);

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

			socket.removeListener('error', onSocketError);

			wss.handleUpgrade(request, socket, head, (ws) => {
				wss.emit('connection', ws, request, user, app);
			});

			if (user) activeUsersChart.update(user);
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
}

function auth(request: http.IncomingMessage) {
	if (!request.url) return [null, null];

	const qs = request.url.split('?')[1];
	if (!qs) return [null, null];

	const q = querystring.parse(qs);
	if (!q.i) return [null, null];

	return authenticate(q.i as string);
}
