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

		assert.deepStrictEqual(note.uri, post.id);
		assert.deepStrictEqual(note.visibility, 'public');
		assert.deepStrictEqual(note.text, post.content);
	});
});
