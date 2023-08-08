import * as http from 'http';
import * as WebSocket from 'ws';
import { serverEventEmitter, ParsedServerMessage } from '../../services/server-event-emitter';

import MainStreamConnection from './stream';
import authenticate, { AuthenticationError } from './authenticate';
import { EventEmitter } from 'events';
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
			lastActive = Date.now();
		};
		updateLastActive();

		ws.on('error', e => streamLogger.error(e));

		ws.on('message', data => {
			streamLogger.debug(`[${userHash}] recv ${data}`);
			updateLastActive();

			// implement app layer ping
			if (data.toString() === 'ping') {
				streamLogger.debug(`[${userHash}] app pong`);
				ws.send('pong');
			}
		});

		// handle protocol layer pong from client
		ws.on('pong', () => {
			streamLogger.debug(`[${userHash}] recv pong`);
			updateLastActive();
		});

		// setup events
		const ev = new EventEmitter();

		const onServerMessage = (parsed: ParsedServerMessage) => {
			ev.emit(parsed.channel, parsed.message);
		};

		serverEventEmitter.on('message', onServerMessage);

		const main = new MainStreamConnection(ws, ev, client.user, client.app);

		// 定期的にpingと無応答切断をする
		const intervalId = setInterval(() => {
			streamLogger.debug(`[${userHash}] send ping`);
			ws.ping();

			if (Date.now() - lastActive > 10 * 60 * 1000) {
				streamLogger.warn(`[${userHash}] user=${client.user?.username} timeout`);
				ws.terminate();
			}
		}, 1 * 60 * 1000);

		// 定期的にアクティブユーザーを更新する
		const intervalId2 = setInterval(() => {
			if (client.user) {
				streamLogger.debug(`[${userHash}] update active user`);
				activeUsersChart.update(client.user);
			}
		}, 5 * 60 * 1000);

		ws.once('close', () => {
			streamLogger.debug(`[${userHash}] close`);
			ev.removeAllListeners();
			main.dispose();
			serverEventEmitter.off('message', onServerMessage);
			clearInterval(intervalId);
			clearInterval(intervalId2);
		});
	});
}

function auth(request: http.IncomingMessage) {
	if (!request.url) throw new Error('request.url is null');

	const qs = request.url.split('?')[1];
	if (!qs) return [null, null];

	const q = querystring.parse(qs);
	if (!q.i) return [null, null];

	return authenticate(q.i as string);	// TODO: RealIP取れない
}
