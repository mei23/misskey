// TS_NODE_FILES=true mocha test/rsa-signature-2017.ts --require ts-node/register

import * as assert from 'assert';
import { LdSignature } from '../src/remote/activitypub/misc/ld-signature';
import { genKeyPair } from './utils';
import { INote } from '../src/models/note';
import * as mongo from 'mongodb';

const data = {
	"@context": [
		"https://w3id.org/identity/v1",
	],
	"title": "a",
	"signature": {
		"type": "RsaSignature2017",
		"creator": "https://mastodon.cloud/users/transmute#main-key",
		"created": "2018-12-22T18:23:12Z",
		"signatureValue": "dO9UeEBI5Lab4hlAkv8jpSCBPP49/LGx+7wonkhYOeC1hzRLBSMCtUPrNEseugtsu4m7cv7ZOSKiyN/d+b9eEyK/iFKkAi2oEunQOoLsX4hsm451VakuH4eFMOJh2G77+yUwuebb74zKfKFeE/KR+yh7pxkr2LuFzNYTfSTpQaMmVE1LUy5XOMIsCWIE3LL4qZAdP5cLqCdPRgqCHsSafqL0EOHunNTzE/bTrM38ptuMEL2zGQTFif3NCtNzW1SvKvZSel03KQ6uNUZbdDD8i9IYbzJrmjzYz5owY/ospVB6f3KoS0TRgYFU25EIp/a8PWHz7uNSzJkBUnT514gRvA=="
	}
};

describe('RsaSignature2017', () => {
	it('Basic sign/verify', async () => {
		const ldSignature = new LdSignature();
		ldSignature.debug = true;

		const kp = await genKeyPair();

		const signed = await ldSignature.signRsaSignature2017(data, kp.privateKey, 'https://example.com/users/1');
		const verified = await ldSignature.verifyRsaSignature2017(signed, kp.publicKey);
		assert.strictEqual(verified, true);
	});

	/*
	it('Basic sign/verify no preLoad', async () => {
		const ldSignature = new LdSignature();
		ldSignature.preLoad = false;
		ldSignature.debug = true;

		const kp = await genKeyPair();

		const signed = await ldSignature.signRsaSignature2017(data, kp.privateKey, 'https://example.com/users/1');
		const verified = await ldSignature.verifyRsaSignature2017(signed, kp.publicKey);
		assert.strictEqual(verified, true);
	});
	*/
});
