import * as https from 'https';
import { sign } from 'http-signature';
import { URL } from 'url';
import * as crypto from 'crypto';

import config from '../../config';
import { ILocalUser } from '../../models/user';
import { publishApLogStream } from '../../services/stream';
import { httpsAgent } from '../../misc/fetch';

export default async (user: ILocalUser, url: string, object: any) => {
	const timeout = 20 * 1000;

	const { protocol, hostname, port, pathname, search } = new URL(url);

	const data = JSON.stringify(object);

	const sha256 = crypto.createHash('sha256');
	sha256.update(data);
	const hash = sha256.digest('base64');

	await new Promise((resolve, reject) => {
		const req = https.request({
			agent: httpsAgent as https.Agent,
			protocol,
			hostname,
			port,
			method: 'POST',
			path: pathname + search,
			timeout,
			headers: {
				'User-Agent': config.userAgent,
				'Content-Type': 'application/activity+json',
				'Digest': `SHA-256=${hash}`
			}
		}, res => {
			if (res.statusCode >= 400) {
				reject(res);
			} else {
				resolve();
			}
		});

		sign(req, {
			authorizationHeaderName: 'Signature',
			key: user.keypair,
			keyId: `${config.url}/users/${user._id}#main-key`,
			headers: ['(request-target)', 'date', 'host', 'digest']
		});

		req.on('timeout', () => req.abort());

		req.on('error', e => {
			if (req.aborted) reject('timeout');
			reject(e);
		});

		req.end(data);
	});

	//#region Log
	publishApLogStream({
		direction: 'out',
		activity: object.type,
		host: null,
		actor: user.username
	});
	//#endregion
};

/**
 * Get AP object with http-signature
 * @param user http-signature user
 * @param url URL to fetch
 */
export async function signedGet(url: string, user: ILocalUser) {
	const timeout = 10 * 1000;

	const { protocol, hostname, port, pathname, search } = new URL(url);

	const buffer: Buffer[] = [];

	return await new Promise((resolve, reject) => {
		const req = https.request({
			agent: httpsAgent as https.Agent,
			protocol,
			hostname,
			port,
			method: 'GET',
			path: pathname + search,
			timeout,
			headers: {
				'Accept': 'application/activity+json, application/ld+json',
				'User-Agent': config.userAgent,
			}
		});

		sign(req, {
			authorizationHeaderName: 'Signature',
			key: user.keypair,
			keyId: `${config.url}/users/${user._id}#main-key`,
			headers: ['(request-target)', 'host', 'date', 'accept']
		});

		req.on('timeout', () => req.abort());

		req.on('error', e => {
			if (req.aborted) reject('timeout');
			reject(e);
		});

		req.on('response', res => {
			if (res.statusCode >= 400) {
				reject(res);
			} else {
				res.on('data', data => {
					buffer.push(Buffer.from(data))
				});
				res.on('end', () => {
					try {
						resolve(JSON.parse(buffer.toString()));
					} catch (e) {
						reject(e);
					}
				});
			}
		});

		req.end();
	});
}

