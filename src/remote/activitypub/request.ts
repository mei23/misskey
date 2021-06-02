import config from '../../config';
import fetch from 'node-fetch';
import { getAgentByUrl } from '../../misc/fetch';
import { genSignedPost, genSignedGet } from './signed-request';
import { ILocalUser } from '../../models/user';

export default async (user: ILocalUser, url: string, object: any) => {
	const body = JSON.stringify(object);

	const req = genSignedPost({ privateKeyPem: user.keypair, keyId: `${config.url}/users/${user._id}#main-key` }, url, body, {
			'User-Agent': config.userAgent,
	});

	const timeout = 10 * 1000;

	const controller = new AbortController();

	setTimeout(() => {
		controller.abort();
	}, timeout * 6);

	const res = await fetch(url, {
		method: req.request.method,
		body: body,
		headers: req.request.headers,
		timeout,
		size: 10 * 1024 * 1024,
		agent: getAgentByUrl,
		signal: controller.signal,
	});

	if (!res.ok) {
		throw {
			name: `StatusError`,
			statusCode: res.status,
			statusMessage: res.statusText,
			message: `${res.status} ${res.statusText}`,
		};
	}
};

/**
 * Get AP object with http-signature
 * @param user http-signature user
 * @param url URL to fetch
 */
export async function signedGet(url: string, user: ILocalUser) {
	const req = genSignedGet({ privateKeyPem: user.keypair, keyId: `${config.url}/users/${user._id}#main-key` }, url, {
		'User-Agent': config.userAgent,
	});

	const timeout = 10 * 1000;

	const controller = new AbortController();

	setTimeout(() => {
		controller.abort();
	}, timeout * 6);

	const res = await fetch(req.request.url, {
		headers: req.request.headers,
		timeout,
		size: 10 * 1024 * 1024,
		agent: getAgentByUrl,
		signal: controller.signal,
	});

	if (!res.ok) {
		throw {
			name: `StatusError`,
			statusCode: res.status,
			statusMessage: res.statusText,
			message: `${res.status} ${res.statusText}`,
		};
	}

	try {
		return await res.json();
	} catch (e) {
		throw {
			name: `JsonParseError`,
			statusCode: 481,
			message: `JSON parse error ${e.message || e}`
		};
	}
}
