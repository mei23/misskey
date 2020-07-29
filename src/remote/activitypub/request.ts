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
			headers: ['date', 'host', 'digest']
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
