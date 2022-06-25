import { subsdcriber as subscriber } from '../db/redis';
import { EventEmitter } from 'events';

let ev: EventEmitter;

export function getServerSubscriber() {
	if (!ev) setupServerEv();
	return ev;
}

function setupServerEv() {
	ev = new EventEmitter();

	subscriber.on('message', async (_, data) => {
		const obj = JSON.parse(data);
		ev.emit(obj.channel, obj.message);
	});
}
