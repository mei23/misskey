import * as http from 'http';
import * as https from 'https';
import got from 'got';
import { getAgentByUrl, receiveResponce } from '../../misc/fetch';
import { sign } from 'http-signature';
import { URL } from 'url';
import * as crypto from 'crypto';

import config from '../../config';
import { ILocalUser } from '../../models/user';
import { publishApLogStream } from '../../services/stream';

export default async (user: ILocalUser, url: string, object: any) => {
	const timeout = 20 * 1000;

	const data = JSON.stringify(object);

	const sha256 = crypto.createHash('sha256');
	sha256.update(data);
	const hash = sha256.digest('base64');

	const req = got.post<any>(url, {
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

/**
 * Get AP object with http-signature
 * @param user http-signature user
 * @param url URL to fetch
 */
export async function signedGet(url: string, user: ILocalUser) {
	const timeout = 10 * 1000;

	const req = got.get<any>(url, {
		headers: {
			'Accept': 'application/activity+json, application/ld+json',
			'User-Agent': config.userAgent,
		},
		responseType: 'json',
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
							headers: ['(request-target)', 'host', 'date', 'accept']
						});

						return clientRequest;
					};
				},
			],
		},
		retry: 0,
	});

	const res = await receiveResponce(req, 10 * 1024 * 1024);

	return res.body;
}
