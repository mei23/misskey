/*
 * SPDX-FileCopyrightText: mei23
 * SPDX-License-Identifier: MIT
 */

import { genRFC3230DigestHeader, RequestLike, signAsDraftToRequest } from '@misskey-dev/node-http-message-signatures';

type PrivateKey = {
	privateKeyPem: string;
	keyId: string;
};

export async function createSignedPost(args: { key: PrivateKey, url: string, body: string, digest?: string, additionalHeaders: Record<string, string> }) {
	const u = new URL(args.url);

	const request: RequestLike = {
		url: u.href,
		method: 'POST',
		headers:  objectAssignWithLcKey({
			'Date': new Date().toUTCString(),
			'Host': u.hostname,
			'Content-Type': 'application/activity+json',
		}, args.additionalHeaders),
	};

	// TODO: levelによって処理を分ける
	const digestHeader = await genRFC3230DigestHeader(args.body, 'SHA-256');
	request.headers['Digest'] = digestHeader;

	const result = await signAsDraftToRequest(request, args.key, ['(request-target)', 'date', 'host', 'digest']);

	return {
		request,
		...result,
	};
}

export async function createSignedGet(args: { key: PrivateKey, url: string, additionalHeaders: Record<string, string> }) {
	const u = new URL(args.url);

	const request: RequestLike = {
		url: u.href,
		method: 'GET',
		headers:  objectAssignWithLcKey({
			'Accept': 'application/activity+json, application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
			'Date': new Date().toUTCString(),
			'Host': new URL(args.url).hostname,
		}, args.additionalHeaders),
	};

	// TODO: levelによって処理を分ける
	const result = await signAsDraftToRequest(request, args.key, ['(request-target)', 'date', 'host', 'accept']);

	return {
		request,
		...result,
	};
}


function lcObjectKey(src: Record<string, string>) {
	const dst: Record<string, string> = {};
	for (const key of Object.keys(src).filter(x => x != '__proto__' && typeof src[x] === 'string')) dst[key.toLowerCase()] = src[key];
	return dst;
}

function objectAssignWithLcKey(a: Record<string, string>, b: Record<string, string>) {
	return Object.assign(lcObjectKey(a), lcObjectKey(b));
}
