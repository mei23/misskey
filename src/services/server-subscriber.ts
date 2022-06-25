import { createConnection } from '../db/redis';
import { EventEmitter } from 'events';
import config from '../config';

let ev: EventEmitter;

export function getServerSubscriber() {
	if (!ev) setupServerEv();
	return ev;
}

function setupServerEv() {
	ev = new EventEmitter();

	const subscriber = createConnection();
	subscriber.subscribe(config.host);

	subscriber.on('message', async (_, data) => {
		const obj = JSON.parse(data);
		ev.emit(obj.channel, obj.message);
	});
}
