// tslint:disable: quotemark

import { MockResolver } from './remote/activitypub/resolver';
import { createPerson } from './remote/activitypub/models/person';

async function main() {
	const resolver = new MockResolver()
	resolver._register('https://1.example.com/actor3', {
		type: 'application/activity+json',
		content: JSON.stringify({
			"@context": "https://www.w3.org/ns/activitystreams",
			"id": "https://1.example.com/actor3",
			"type": "Person",
			"preferredUsername": "3",
			"inbox": "https://1.example.com/inbox",
			"outbox": "https://1.example.com/outbox"
		})
	});

	const user = await createPerson('https://1.example.com/actor3', resolver);
	console.log(`1: ${JSON.stringify(user, null, 2)}`);
}

main().then(() => {
	console.log('OK');
});
