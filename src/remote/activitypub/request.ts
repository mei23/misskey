import * as http from 'http';
import * as https from 'https';
import { sign } from 'http-signature';
import { URL } from 'url';
import * as crypto from 'crypto';

import config from '../../config';
import { ILocalUser } from '../../models/user';
import { publishApLogStream } from '../../services/stream';
import { getAgentByUrl, receiveResponce } from '../../misc/fetch';
import got from 'got';

export default async (user: ILocalUser, url: string, object: any) => {
	const timeout = 20 * 1000;

	const data = JSON.stringify(object);

	const sha256 = crypto.createHash('sha256');
	sha256.update(data);
	const hash = sha256.digest('base64');

	const req = got.post(url, {
		body: data,
		headers: {
			'User-Agent': config.userAgent,
			'Content-Type': 'application/activity+json',
			'Digest': `SHA-256=${hash}`
		},
		timeout,
		hooks: {
			beforeRequest: [
				options => {
					options.request = (url: URL, opt: http.RequestOptions, callback?: (response: any) => void) => {
						// Select custom agent by URL
						opt.agent = getAgentByUrl(url, false);

						// Wrap original https?.request
						const requestFunc = url.protocol === 'http:' ? http.request : https.request;
						const clientRequest = requestFunc(url, opt, callback) as http.ClientRequest;

						// HTTP-Signature
						sign(clientRequest, {
							authorizationHeaderName: 'Signature',
							key: user.keypair,
							keyId: `${config.url}/users/${user._id}#main-key`,
							headers: ['(request-target)', 'date', 'host', 'digest']
						});

						return clientRequest;
					};
				},
			],
		},
		retry: 0,
	});

	await receiveResponce(req, 10 * 1024 * 1024);

	//#region Log
	publishApLogStream({
		direction: 'out',
		activity: object.type,
		host: null,
		actor: user.username
	});
	//#endregion
};
