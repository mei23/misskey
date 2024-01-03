import config from '../../config';
import { getResponse } from '../../misc/fetch';
import { createSignedPost, createSignedGet } from './ap-request';
import { ILocalUser } from '../../models/user';
import { ThinUserWithKey } from '../../queue/types';

export default async (user: ThinUserWithKey, url: string, object: any, digest?: string) => {
	const body = typeof object === 'string' ? object : JSON.stringify(object);

	const req = createSignedPost({
		key: {
			privateKeyPem: user.keypair,
			keyId: `${config.url}/users/${user._id}#main-key`
		},
		url,
		body,
		digest,
		additionalHeaders: {
			'User-Agent': config.userAgent,
		}
	});

	const res = await getResponse({
		url,
		method: req.request.method,
		headers: req.request.headers,
		body,
		timeout: 10 * 1000,
	});

	return `${res.statusCode} ${res.statusMessage} ${res.body}`;
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

	if (res.body.length > 65536) throw new Error('too large JSON');

	return await JSON.parse(res.body);
}
