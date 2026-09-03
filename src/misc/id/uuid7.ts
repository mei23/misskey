// draft-ietf-uuidrev-rfc4122bis-14
// https://www.ietf.org/archive/id/draft-ietf-uuidrev-rfc4122bis-14.html
// 5.7. UUID Version 7
// without OPTIONAL sub-millisecond timestamp fraction
// without OPTIONAL carefully seeded counter

export function uuid7() {
	// 48bit(12char) UNIX timestamp (ms)
	const timestamp = Date.now().toString(16).padStart(12, '0').slice(-12);
	// 4bit(1char) version
	const ver = '7';
	// 12bit(3char) rand_a
	const randA = getRandomHex(3);

	// 64bit(16char) var + rand_b

	//  最初の2charのうち最初の2bitは10
	const x2 = getRandomHex(2);
	let n = parseInt(x2, 16) & 0b0011_1111 | 0b1000_0000;
	const randB1 = n.toString(16).padStart(2, '0');

	//  残り14char
	const randB2 = getRandomHex(14);
	
	const combined = timestamp + ver + randA + randB1 + randB2;
	const splited = `${combined.substring(0, 8)}-${combined.substring(8, 12)}-${combined.substring(12, 16)}-${combined.substring(16, 20)}-${combined.substring(20)}`;
	return splited;
}

function getRandomHex(len: number) {
	const jo = Math.floor(len / 2);
	const yo = len % 2;
	
	let result = '';
	for (let i = 0; i < jo; i++) {
		result += getRandom2CharInHex();
	}

	if (yo > 0) result += getRandom2CharInHex().substring(1);

	return result;
}

function getRandom2CharInHex(): string {
	return getRandomByte().toString(16).padStart(2, '0').slice(-2);
}

const getRandomByte = getRandomByteNode;


// WebCrypto版 (未使用、Nodeはv19以降)
function getRandomByteWeb(): number {
	if (typeof globalThis.crypto?.getRandomValues !== 'undefined') {
		const a = new Uint8Array(1);
		globalThis.crypto.getRandomValues(a);
		return a[0];
	} else {
		return Math.min(Math.floor(Math.random() * 256), 255);
	}
}

import * as crypto from 'crypto';

function getRandomByteNode(): number {
	return crypto.randomBytes(1).readUInt8(0)
}

