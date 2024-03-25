import config from '../../config';
import { StatusError, getResponse } from '../../misc/fetch';
import { createSignedPost, createSignedGet } from './ap-request';
import User, { ILocalUser, isLocalUser } from '../../models/user';
import { ThinUser } from '../../queue/types';
import type { Response } from 'got';
import { checkAllowedUrl } from '../../misc/check-allowed-url';

export default async (user: ThinUser, url: string, object: any, httpMessageSignaturesImplementationLevel?: string) => {
	const body = typeof object === 'string' ? object : JSON.stringify(object);

	const key = await getPrivateKey(user, httpMessageSignaturesImplementationLevel);

	const req = await createSignedPost({
		key,
		url,
		body,
		//digest,	TODO
		additionalHeaders: {
			'User-Agent': config.userAgent,
		}
	});

	console.log(`deliver with: ${JSON.stringify(req, null, 2)}`);	// TODO消す

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
export async function apGet(url: string, user?: ILocalUser, httpMessageSignaturesImplementationLevel?: string) {
	let res: Response<string>;

	if (!checkAllowedUrl(url)) {
		throw new StatusError('Invalid URL', 400);
	}

	if (user) {
		const key = await getPrivateKey(user, httpMessageSignaturesImplementationLevel);

		const req = await createSignedGet({
			key,
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

	return await JSON.parse(res.body);
}

function validateContentType(contentType: string | null | undefined): boolean {
	if (contentType == null) return false;

	const parts = contentType.split(/\s*;\s*/);
	if (parts[0] === 'application/activity+json') return true;
	if (parts[0] !== 'application/ld+json') return false;
	return parts.slice(1).some(part => part.trim() === 'profile="https://www.w3.org/ns/activitystreams"');
}

async function getPrivateKey(_user: ThinUser, level?: string) {
	const user = await User.findOne({ _id: _user._id });	// TODO: cache
	if (user == null) throw new Error(`user not found`);
	if (isLocalUser(user) !== true) throw new Error(`user is not local`);

	if (level != null && level !== '00' && user.ed25519Key) {
		return {
			privateKeyPem: user.ed25519Key,
			keyId: `${config.url}/users/${user._id}#ed25519-key`,
		}
	} else {
		return {
			privateKeyPem: user.keypair,
			keyId: `${config.url}/users/${user._id}#main-key`,
		}
	}
}
