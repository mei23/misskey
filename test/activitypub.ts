/*
 * Tests of ActivityPub
 *
 * How to run the tests:
 * > TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true mocha test/activitypub.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true TS_NODE_TRANSPILE_ONLY=true mocha test/activitypub.ts --require ts-node/register -g 'test name'
 */

// tslint:disable:quotemark

process.env.NODE_ENV = 'test';

import * as assert from 'assert';

import rndstr from 'rndstr';
import Resolver from '../src/remote/activitypub/resolver';
import { IObject } from '../src/remote/activitypub/type';
import { createPerson } from '../src/remote/activitypub/models/person';
import { createNote } from '../src/remote/activitypub/models/note';
import { tryProcessInbox } from '../src/queue/processors/inbox';
import { LdSignature } from '../src/remote/activitypub/misc/ld-signature';
import { genRsaKeyPair, genEcKeyPair } from '../src/misc/gen-key-pair';

//#region Mock
type MockResponse = {
	type: string;
	content: string;
};

class MockResolver extends Resolver {
	private _rs = new Map<string, MockResponse>();
	public async _register(uri: string, content: string | Record<string, any>, type = 'application/activity+json') {
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

describe('ActivityPub', () => {
	describe('Parse minimum object', () => {
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
			const resolver = new MockResolver();
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

		const sig = {
			privateKey: '-----BEGIN PRIVATE KEY-----\n' +
				'MIIEwAIBADANBgkqhkiG9w0BAQEFAASCBKowggSmAgEAAoIBAQC705lqJh9iElEX\n' +
				'DuISRJh8YEg8qEB9STKcRv0xcmTtA9T3lpm0ke47x+LXOv7HJ3TDVSAannWynpjM\n' +
				'oEWqTpCh6GSgQVoeBJPuqiSWNvfVIoCG+PVgjtdL6B8Ve9A0pcxwecOzqlhWCN3V\n' +
				'4Ov51bE0gkXP+N/7igwMmZ0UP7wTTN2PbnWikl23jMo5g9sVI66mf9Y/ivwc6CDd\n' +
				'bHcu/hjxJFGOfwjjDZFR8wyCC7jru50vEb6L3JJCyvWkGUW5hQvFMgJoia2lTShk\n' +
				'VT25PVt3wQxBc2Z2q6m1Qf9sYpQhy3Y63ZQPMFUDCAHqp0NCaiSxUR7BrBELDyvd\n' +
				'Shk4Se2VAgMBAAECggEBALQgLyZPPRWOP1n/meqvAhV1OJGDQaVlBzY8FiDPdd6f\n' +
				'KCPwt6Mlt/R4syB5oVBYlG+nOUyN3o3X7u1+XpD/G1FKTwYo5kWXWk8tuDyepnot\n' +
				'xliqdJePJQXUq8qsnHWA81iCTZ4FpQWNJ0EvnN5Rgsm6jTzvjc3rC7chsjRzEujl\n' +
				'zaVZIomLaIqZOZ51nHMhUbobpfjXLZ3M2AWZn05fTWazm7s4ZcI8yRqeEskLSnqz\n' +
				'0vh9VKyIWAHgmbi58mQOGbk6e0X7RCpUGdfQy9rQiTldQpfs8SNEwrBDBWmISqM1\n' +
				'zU+mSnO8vXNvgZhwRbvDsyRDaR0pKi8JT1PbfGa8iMECgYEA8We5z0kKhdqgz/Ck\n' +
				'b2OivpIqW5rJ6HdMYrXFthd3li6RK8hMPJCt8nlfLsL53BS31FSMbafEvdQabqql\n' +
				'XvEV4F7WiDrepyMRVV6vnl5P8FpARb5fJaDJUHRx1K/XQsLx+rBqal+yRfGFZXyG\n' +
				'205+2GATsbei3YLt0xeEBzOtxm0CgYEAxy6gfOwwrTVgSnJCbZalX4IJHVU7km7l\n' +
				'OU9f5LMilpSG/+HMP1zEHe6VlmdqFwNjCqJkFx4O/zddcaZirO1miQdm/G3RkLrh\n' +
				'7aUPlXNlxdux0RsLKFalckyT5Ki5q4ljXbgakg6MNEvwtpzlPxDj1RQ0e9a+xT7I\n' +
				'RdPUv8VwaskCgYEAk26O21q3c4JPfk9wjZrjNNIdzm5da30YiJyNECWK4oy0GnIs\n' +
				'pTyTD6gyimOHp3J7xtCQJxQ0It8b+YR8lNxWSP6CtRaHDrprBqFaTjU5SwhDgpS+\n' +
				'lUN6T4meT4/IvrxCfqEpjKe/P9o+ZvnDfsKU017yCDKn4/Lnfmk5OBDGy40CgYEA\n' +
				'iratK/KtP6NBiPcjzgAw8V+1C0mVcDhsyMm/hZ0/hFCx57gPrzzik9nZMWKZ3qcM\n' +
				'LZbET9kuJo0fNYvjgnzegKW4EipE3R9ZQlBGlxVDllSW9IJ59cDJ/dzYzlC25YCL\n' +
				'w/P4BSm+eJk+bV68xHv1vyoQFwKJ3wIHJaINsvREgwkCgYEAgokRzKQkrN3u+4hW\n' +
				'nQyCtw4zAya3vADnpjqYKJP0+6krDIYga0ECmcuxMODcCCzT8jNUZ+SZOOmo5/pq\n' +
				'kkqdJGB7WdQ2GV99+JL+iAxuL5Hg/s3vPUJnqNh/mqNrDD79YgtKudV9Xz5UPovM\n' +
				'IPOaHB/A1AkSkjEp0NiYbicbo04=\n' +
				'-----END PRIVATE KEY-----\n',
			publicKey: '-----BEGIN PUBLIC KEY-----\n' +
				'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu9OZaiYfYhJRFw7iEkSY\n' +
				'fGBIPKhAfUkynEb9MXJk7QPU95aZtJHuO8fi1zr+xyd0w1UgGp51sp6YzKBFqk6Q\n' +
				'oehkoEFaHgST7qokljb31SKAhvj1YI7XS+gfFXvQNKXMcHnDs6pYVgjd1eDr+dWx\n' +
				'NIJFz/jf+4oMDJmdFD+8E0zdj251opJdt4zKOYPbFSOupn/WP4r8HOgg3Wx3Lv4Y\n' +
				'8SRRjn8I4w2RUfMMggu467udLxG+i9ySQsr1pBlFuYULxTICaImtpU0oZFU9uT1b\n' +
				'd8EMQXNmdquptUH/bGKUIct2Ot2UDzBVAwgB6qdDQmoksVEewawRCw8r3UoZOEnt\n' +
				'lQIDAQAB\n' +
				'-----END PUBLIC KEY-----\n',
			signingString: '(request-target): post /inbox\n' +
				'host: host2.test\n' +
				'date: Sun, 30 May 2021 08:52:59 GMT\n' +
				'digest: x',
			signature: 'TCnwHkzEQ0doqZPr0o6nwdD/KTMKBQnZl0QZg9X2iUiBGn4JO2Xq91fFrJ2hbjYiTkrCxHgxA3L/eZgjRe7JyCOscJL87aa3i2TbOxBcEo/Wp8+Kav7KENC8l2O6kXVG0Elr0v4D0Z/XM/9fvmfRxAas/Ub6Nmj4LAEkAMrdH0IEx2UcvZ9UtqtJdYaBxRGdMOGnaaLEe4X12c5bGwQ0mOCpsqEsUQCTQAxiw2aVesEH8M+7vaGahfq4oJ7N+5sujiOWQVEfU0TXj1eJiVotqbQwPvZjjMbpT6tatkdu6DIUVWIZX4g5OloNKQ1o82yxx3mYVpbePlEGhoSKLOSzuA=='
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
				publicKeyPem: sig.publicKey
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

		const signature = {
			scheme: 'Signature',
			params: {
				keyId: actor.publicKey.id,
				algorithm: 'rsa-sha256',
				headers: [ '(request-target)', 'date', 'host', 'digest' ],
				signature: sig.signature,
			},
			signingString: sig.signingString,
			algorithm: 'RSA-SHA256',
			keyId: actor.publicKey.id,
		};

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

	describe('RsaSignature2017', () => {
		const data = {
			"@context": [
				"https://w3id.org/identity/v1",
			],
			"title": "a",
		};

		it('Basic sign/verify', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');
			const verified = await ldSignature.verifyRsaSignature2017(signed, rsa1.publicKey);
			assert.strictEqual(verified, true);
		});

		it('Verification fails if another key', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();
			const rsa2 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');
			const verified = await ldSignature.verifyRsaSignature2017(signed, rsa2.publicKey);
			assert.strictEqual(verified, false);
		});

		it('Verification fails if tampered', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			const tampered = { ...signed };
			tampered.title = 'b';

			const verified = await ldSignature.verifyRsaSignature2017(tampered, rsa1.publicKey);
			assert.strictEqual(verified, false);
		});

		it('Rejects if signature.type is not RsaSignature2017', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			const another = { ...signed };
			another.signature.type = 'AnotherSignature';

			await assert.rejects(ldSignature.verifyRsaSignature2017(data, rsa1.publicKey), {
				message: 'signature is not RsaSignature2017'
			});
		});

		it('Rejects if privateKey is not rsa', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const ec1 = await genEcKeyPair();

			await assert.rejects(ldSignature.signRsaSignature2017(data, ec1.privateKey, 'https://example.com/users/1'), {
				message: 'privateKey is not rsa'
			});
		});

		it('Rejects if publicKey is not rsa', async () => {
			const ldSignature = new LdSignature();
			ldSignature.debug = true;

			const rsa1 = await genRsaKeyPair();
			const ec1 = await genEcKeyPair();

			const signed = await ldSignature.signRsaSignature2017(data, rsa1.privateKey, 'https://example.com/users/1');

			await assert.rejects(ldSignature.verifyRsaSignature2017(signed, ec1.publicKey), {
				message: 'publicKey is not rsa'
			});
		});
	});
});
