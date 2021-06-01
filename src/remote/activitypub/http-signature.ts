import * as crypto from 'crypto';
const { createSignatureString } = require('http-signature-header');

export type RequestOptions = {
	url: string;
	method: string;
	headers: Record<string, string>;
};

export type SignatureKey = {
	privateKeyPem: string;
	keyId: string;
};

export type SignatureHashAlgorithm = 'sha256' | 'sha384' | 'sha512';

export class HttpSignatureSigner {
	private key: SignatureKey;
	public hashAlgorithm: SignatureHashAlgorithm = 'sha256';

	constructor(key: SignatureKey) {
		this.key = key;
	}

	public signToRequest(requestOptions: RequestOptions, includeHeaders: string[]) {
		const signingString = genSigningString(requestOptions, includeHeaders);
		const signature = genSignature(signingString, this.key.privateKeyPem, this.hashAlgorithm);
		const signatureHeader = genSignatureHeader(includeHeaders, this.key.keyId, signature, this.hashAlgorithm);
		Object.assign(requestOptions.headers, {
			Signature: signatureHeader
		});

		return {
			signingString,
			signature,
			signatureHeader,
		}
	}
}

export function genSigningString(requestOptions: RequestOptions, includeHeaders: string[]) {
	return createSignatureString({
		includeHeaders,
		requestOptions,
	}) as string;
}

export function genSignature(signingString: string, privateKey: string, hashAlgorithm: SignatureHashAlgorithm = 'sha256') {
	// TODO: privateKeyは本当にRSA?
	const sign = crypto.createSign(hashAlgorithm);
	sign.update(signingString);
	sign.end();

	return sign.sign(privateKey, 'base64');
}

export function genAuthorizationHeader(includeHeaders: string[], keyId: string, signature: string, hashAlgorithm: SignatureHashAlgorithm = 'sha256') {
	return `Signature ${genSignatureHeader(includeHeaders, keyId, signature, hashAlgorithm)}`;
}

export function genSignatureHeader(includeHeaders: string[], keyId: string, signature: string, hashAlgorithm: SignatureHashAlgorithm = 'sha256') {
	return `keyId="${keyId}",algorithm="rsa-${hashAlgorithm}",headers="${includeHeaders.join(' ')}",signature="${signature}"`;
}
