import config from '../../config';
import { getResponse } from '../../misc/fetch';
import { createSignedPost, createSignedGet } from './ap-request';
import { ILocalUser } from '../../models/user';

export default async (user: ILocalUser, url: string, object: any) => {
	const body = JSON.stringify(object);

	const req = createSignedPost({
		key: {
			privateKeyPem: user.keypair,
			keyId: `${config.url}/users/${user._id}#main-key`
		},
		url,
		body,
		additionalHeaders: {
			'User-Agent': config.userAgent,
		}
	});

	await getResponse({
		url,
		method: req.request.method,
		headers: req.request.headers,
		body,
	});
};

/**
 * Get AP object with http-signature
 * @param user http-signature user
 * @param url URL to fetch
 */
export async function signedGet(url: string, user: ILocalUser) {
	const req = createSignedGet({
		key: {
			privateKeyPem: user.keypair,
			keyId: `${config.url}/users/${user._id}#main-key`
		},
		url,
		additionalHeaders: {
			'User-Agent': config.userAgent,
		}
	});

	const res = await getResponse({
		url,
		method: req.request.method,
		headers: req.request.headers
	});

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

