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

type MockResponse = {
	type: string;
	content: string;
};

export class MockResolver extends Resolver {
	//#region For mock
	private _rs = new Map<string, MockResponse>();
	public async _register(uri: string, content: string | Object, type = 'application/activity+json') {
		this._rs.set(uri, {
			type,
			content: typeof content === 'string' ? content : JSON.stringify(content)
		});
	}
	//#endregion

	//#region Overrides
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
	//#endregion
}

describe('Parse Object', async () => {
	it('Minimum Actor', async () => {
		const preferredUsername = rndstr('a-zA-Z0-9', 8);
		const id = `https://host1.test/users/${preferredUsername}`;
		const inbox = `${id}/inbox`;
		const outbox = `${id}/outbox`;

		const resolver = new MockResolver()
		resolver._register(id, {
			'@context': 'https://www.w3.org/ns/activitystreams',
			id,
			type: 'Person',
			preferredUsername,
			inbox,
			outbox,
		});

		const user = await createPerson(id, resolver);

		assert.deepStrictEqual(user.uri, id);
		assert.deepStrictEqual(user.username, preferredUsername);
		assert.deepStrictEqual(user.inbox, inbox);
		assert.deepStrictEqual(user.outbox, outbox);
	});
});
