// tslint:disable: quotemark

import { MockResolver } from './remote/activitypub/resolver';
import { createPerson } from './remote/activitypub/models/person';
import rndstr from 'rndstr';
import { inspect } from 'util';

async function main() {
	const preferredUsername =  rndstr('a-zA-Z0-9', 8);
	const id = `https://1.example.com/users/${preferredUsername}`;

	const resolver = new MockResolver()
	resolver._register(id, {
		'@context': 'https://www.w3.org/ns/activitystreams',
		id,
		type: 'Person',
		preferredUsername,
		inbox: `https://1.example.com/inbox/${preferredUsername}`,
		outbox: `https://1.example.com/outbox/${preferredUsername}`,
	});

	const user = await createPerson(id, resolver);
	console.log(`1: ${JSON.stringify(user, null, 2)}`);
}

main().then(() => {
	console.log('OK');
}).catch(e => {
	console.log(inspect(e));
})
