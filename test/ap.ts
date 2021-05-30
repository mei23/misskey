/*
 * Tests of ActivityPub
 *
 * How to run the tests:
 * > TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true mocha test/ap.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true mocha test/ap.ts --require ts-node/register -g 'test name'
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';

import rndstr from 'rndstr';
import Resolver from '../src/remote/activitypub/resolver';
import { IObject } from '../src/remote/activitypub/type';
import { createPerson } from '../src/remote/activitypub/models/person';
import { createNote } from '../src/remote/activitypub/models/note';
import { inspect } from 'util';
import { tryProcessInbox } from '../src/queue/processors/inbox';
import * as crypto from 'crypto';

//#region Mock
type MockResponse = {
	type: string;
	content: string;
};

export class MockResolver extends Resolver {
	private _rs = new Map<string, MockResponse>();
	public async _register(uri: string, content: string | Object, type = 'application/activity+json') {
		this._rs.set(uri, {
			type,
			content: typeof content === 'string' ? content : JSON.stringify(content)
		});
	}

	public async resolve(value: string | IObject): Promise<IObject> {
		if (typeof value !== 'string') return value;

		const r = this._rs.get(value);

		if (!r) {
			throw {
				name: `StatusError`,
				statusCode: 404,
				message: `Not registed for mock`
			};
		}

		const object = JSON.parse(r.content);

		return object;
	}
}
//#endregion

describe('Parse minimum object', async () => {
	const host = 'https://host1.test';
	const preferredUsername = `${rndstr('A-Z', 4)}${rndstr('a-z', 4)}`;
	const actorId = `${host}/users/${preferredUsername.toLowerCase()}`;

	const actor = {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id: actorId,
		type: 'Person',
		preferredUsername,
		inbox: `${actorId}/inbox`,
		outbox: `${actorId}/outbox`,
	};

	const post = {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id: `${host}/users/${rndstr('0-9a-z', 8)}`,
		type: 'Note',
		attributedTo: actor.id,
		to: 'https://www.w3.org/ns/activitystreams#Public',
		content: 'あ',
	};

	it('Minimum Actor', async () => {
		const resolver = new MockResolver()
		resolver._register(actor.id, actor);

		const user = await createPerson(actor.id, resolver);

		assert.deepStrictEqual(user.uri, actor.id);
		assert.deepStrictEqual(user.username, actor.preferredUsername);
		assert.deepStrictEqual(user.inbox, actor.inbox);
		assert.deepStrictEqual(user.outbox, actor.outbox);
	});

	it('Minimum Note', async () => {
		const resolver = new MockResolver()
		resolver._register(actor.id, actor);
		resolver._register(post.id, post);

		const note = await createNote(post.id, resolver, true);

		assert.deepStrictEqual(note?.uri, post.id);
		assert.deepStrictEqual(note?.visibility, 'public');
		assert.deepStrictEqual(note?.text, post.content);
	});
});

describe('inbox', async () => {
	const host = 'https://host1.test';
	const preferredUsername = `${rndstr('A-Z', 4)}${rndstr('a-z', 4)}`;
	const actorId = `${host}/users/${preferredUsername.toLowerCase()}`;

	// RSA 2048
	const keypair = {
		publicKey: '-----BEGIN PUBLIC KEY-----\n' +
			'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxyHWcv0qoirejkw7UIr/\n' +
			'fvlKTivOCnXpX0Uy5eZb4DqMQRrPGxayrHrsP0MFJ9s5MGQ4wcXqW//DGbL618Ce\n' +
			'iMegMx8+ArunUVWiZ1/A5ysQTXkORclo+CQRSwaRWuW46seomuFOMON2/1WXpcv7\n' +
			'WDPYRkTNgu+P1XhJRkjE+a1WwqUDOmcjf9FP1XjfQ83JPVKZClx5/f6ldlNDHOPk\n' +
			'yx3egCUqWCTVjrYmEp8dkhGWZqvkfA83bktxt05Kkg8T/v4OVXLONTs1z7W/aGMy\n' +
			'1lnGtbVa0ykFUQRrNUrZLzZyYp3Jdl1fK3bA3aZPxQCDgdrchz0wT2NuAukUge5l\n' +
			'rwIDAQAB\n' +
			'-----END PUBLIC KEY-----\n',
		privateKey: '-----BEGIN PRIVATE KEY-----\n' +
			'MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDHIdZy/SqiKt6O\n' +
			'TDtQiv9++UpOK84KdelfRTLl5lvgOoxBGs8bFrKseuw/QwUn2zkwZDjBxepb/8MZ\n' +
			'svrXwJ6Ix6AzHz4Cu6dRVaJnX8DnKxBNeQ5FyWj4JBFLBpFa5bjqx6ia4U4w43b/\n' +
			'VZely/tYM9hGRM2C74/VeElGSMT5rVbCpQM6ZyN/0U/VeN9Dzck9UpkKXHn9/qV2\n' +
			'U0Mc4+TLHd6AJSpYJNWOtiYSnx2SEZZmq+R8DzduS3G3TkqSDxP+/g5Vcs41OzXP\n' +
			'tb9oYzLWWca1tVrTKQVRBGs1StkvNnJincl2XV8rdsDdpk/FAIOB2tyHPTBPY24C\n' +
			'6RSB7mWvAgMBAAECggEAHxMNtwYAyCuubUBCJVB7jGH0kXxOe91onKBcz/mBrt0U\n' +
			'E/jOBukk2ruX8EtSG6UfKIkLPlnXN6IS3QjMEi0R0EBupGukrqJ/+rZFUKJlpO1Y\n' +
			'bu6MJqHGiqp+NFoDBs9AawrbKcgs/n4QjMnbj1jkkSAOCPElrOAbbvGFZb1nV5rJ\n' +
			'Vrb8JpUr2K95GB6j3VLaYlWb16zGpjSVKz1BLYbD26zUJRRzipE+Mm/vzJGBWpXd\n' +
			'OTL9LqrR12GIvRiB7J4i3pla/1BeU4ahBLA13WJMwoNGSjL9Wo20Y0BFYYjeEZrq\n' +
			'ALFFR1ghdHcr/7n46U6gvwGsBrxlW2oMycyz0E1cqQKBgQD5L/8bYv0M9zyQiGOj\n' +
			'n56mDcLzdm8LmybPDIKEcPMYn9fVrsPGdQP5rIoLmYvsAu5LtXxQhYciw7R4fHtU\n' +
			'njHAr1kraqsMGNYCP11m11OO4tyeWOsYuOPJoZvehu57fCwXm6vzBw8NrgY0DXtm\n' +
			'9zIdnuX+y7mOjw3Yhlg20yUGywKBgQDMk4QduH36QE5p2lGikqtAl+s1Z0FayWR7\n' +
			'U8B2tfRq4nBeIOQ3OuUp/ZqQD0IOFjqZ5B7FqOIIPt5cdwtbWmsRdYlcjgdF2xap\n' +
			'wYbdvvCykwpkU6V/aribKFIHt5dgNzvTw/vtGSLkqXRxgYsj/0Fq7VWQJhbELLyc\n' +
			'Et6TA0ocLQKBgQCNL1CPJ8rQadR634v0zR+KXgmy/8ty+/lFHoVknMpfjVEw1NA/\n' +
			'xVT3RXcBk4HfutlhM/a3eLBUViYOjhkinG78CV2wZ8N6GyhGJbi56A6Dyq3NWfv6\n' +
			'Ceel+lbiAfllJbmltqH6FGnHCm6hV3IvqKdQeRM/BhagWxUxNQ0OIxu7eQKBgQC3\n' +
			'nKsWldET/AWlAhsFJEjqR7AHFW7WEi3KdwgmQ/dku2oJQdIzM/wc7Q59wAQUaqUc\n' +
			'HF/2HjcJGYwwR3R9ALFaUTkBRkSG0TYNFLJ8cfTNAiZwl5bRvrKEJ/NAE+qco9Zh\n' +
			'oeSKEGZ9/w2RFqkQnPhVBUEniNgkKNb76f+0yV4J3QKBgQC3bilF2Moeob2uiw5u\n' +
			'MIQoI2YtkhmfdERi9nqga9jL3aV6TIjLWekDzQ+XzzNasqrsvb0H0dYBx/siEqHa\n' +
			'TnH/nEasW3CnbZRhfYpZ7zNemezYOGBIfhXgEhP+u4dgIagjs+HMkSfyF1gEpqWA\n' +
			'koncST6l9G/bJHVmQaOmJEgE1g==\n' +
			'-----END PRIVATE KEY-----\n'
	};

	const actor = {
		'@context': [ 'https://www.w3.org/ns/activitystreams', 'https://w3id.org/security/v1' ],
		id: actorId,
		type: 'Person',
		preferredUsername,
		inbox: `${actorId}/inbox`,
		outbox: `${actorId}/outbox`,
		publicKey: {
			id: `${actorId}#main-key`,
			type: 'key',
			owner: actorId,
			publicKeyPem: keypair.publicKey
		}
	};

	const post = {
		//'@context': 'https://www.w3.org/ns/activitystreams',
		id: `${host}/users/${rndstr('0-9a-z', 8)}`,
		type: 'Note',
		attributedTo: actor.id,
		to: [ 'https://www.w3.org/ns/activitystreams#Public' ],
		cc: [ `${actor.id}/followers` ],
		content: 'あ',
	};

	const activity = {
		'@context': [ 'https://www.w3.org/ns/activitystreams' ],
		id: `${post.id}/activity`,
		actor: post.attributedTo,
		type: 'Create',
		object: post,
		to: post.to,
		cc: post.cc,
	} as any;

	const keyType = 'rsa';
	const hashAlg = 'sha256';
	const sigAlg = `${keyType}-${hashAlg}`;

	const signature = {
		scheme: 'Signature',
		params: {
			keyId: actor.publicKey.id,
			algorithm: sigAlg,
			headers: [ '(request-target)', 'date', 'host', 'digest' ],
			signature: ''
		},
		signingString: '(request-target): post /inbox\n' +
			'date: Sun, 30 May 2021 03:57:28 GMT\n' +
			'host: host2.test\n' +
			'digest: SHA-256=KLYUB5VxlDercSu7v3ZiEU+P4qnWIqEt2EMSUobeg4M=',
		algorithm: sigAlg.toUpperCase(),
		keyId: actor.publicKey.id,
	};

	const sign = crypto.createSign(hashAlg);
	sign.update(signature.signingString);
	sign.end();
	const sig = sign.sign(keypair.privateKey, 'base64');

	signature.params.signature = sig;

	it('generic', async () => {
		const resolver = new MockResolver()
		resolver._register(actor.id, actor);
		resolver._register(post.id, post);

		const result = await tryProcessInbox({
			activity,
			signature
		}, { resolver });

		assert.deepStrictEqual(result, 'ok');
	});
});
