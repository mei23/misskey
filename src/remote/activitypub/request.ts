import config from '../../config';
import { StatusError, getResponse } from '../../misc/fetch';
import { createSignedPost, createSignedGet } from './ap-request';
import { ILocalUser } from '../../models/user';
import { ThinUserWithKey } from '../../queue/types';
import type { Response } from 'got';
import { checkAllowedUrl } from '../../misc/check-allowed-url';

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
 * Get AP object
 * @param user http-signature user
 * @param url URL to fetch
 */
export async function apGet(url: string, user?: ILocalUser) {
	let res: Response<string>;

	if (!checkAllowedUrl(url)) {
		throw new StatusError('Invalid URL', 400);
	}

	if (user) {
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

		res = await getResponse({
			url,
			method: req.request.method,
			headers: req.request.headers
		});
	} else {
		res = await getResponse({
			url,
			method: 'GET',
			headers: {
				'Accept': 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
				'User-Agent': config.userAgent,
			},
		});
	}


	if (validateContentType(res.headers['content-type']) !== true) {
		throw new Error('Invalid Content Type');
	}

	if (res.body.length > 65536) throw new Error('too large JSON');

	return {
		object: await JSON.parse(res.body),
		res,
	};
}

function validateContentType(contentType: string | null | undefined): boolean {
	if (contentType == null) return false;

	const parts = contentType.split(/\s*;\s*/);
	if (parts[0] === 'application/activity+json') return true;
	if (parts[0] !== 'application/ld+json') return false;
	return parts.slice(1).some(part => part.trim() === 'profile="https://www.w3.org/ns/activitystreams"');
}
