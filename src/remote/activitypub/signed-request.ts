import * as crypto from 'crypto';
import { RequestOptions, HttpSignatureSigner, SignatureKey } from './http-signature';

export function genSignedPost(key: SignatureKey, url: string, body: string, headers: Record<string, string>) {
	const u = new URL(url);

	const request: RequestOptions = {
		url: u.href,
		method: 'POST',
		headers:  Object.assign({
			'Date': new Date().toUTCString(),
			'Host': u.hostname,
			'Content-Type': 'application/activity+json',
			'Digest': genDigestHeader(body, 'sha256'),
		}, headers),
	};

	const signer = new HttpSignatureSigner(key);

	const result = signer.signToRequest(request, ['(request-target)', 'date', 'host', 'digest']);

	return {
		request,
		signingString: result.signingString,
		signature: result.signature,
		signatureHeader: result.signatureHeader,
	};
}

export function genSignedGet(key: SignatureKey, url: string, headers: Record<string, string>) {
	const u = new URL(url);

	const request: RequestOptions = {
		url: u.href,
		method: 'GET',
		headers:  Object.assign({
			'Accept': 'application/activity+json, application/ld+json',
			'Date': new Date().toUTCString(),
			'Host': u.hostname,
		}, headers),
	};

	const signer = new HttpSignatureSigner(key);

	const result = signer.signToRequest(request, ['(request-target)', 'date', 'host', 'accept']);

	return {
		request,
		signingString: result.signingString,
		signature: result.signature,
		signatureHeader: result.signatureHeader,
	};
}

export function genDigestHeader(body: string, hashAlgorithm: 'sha256' | 'sha512' = 'sha256') {
	const hash = crypto.createHash(hashAlgorithm);
	hash.update(body);
	const digest = hash.digest('base64');
	return `${hashAlgorithm === 'sha256' ? 'SHA-256' : 'SHA-512'}=${digest}`;
}
