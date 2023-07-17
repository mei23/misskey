import { EventEmitter } from 'events';
import config from '../config';
import { createConnection } from '../db/redis';

const serverSubscriber = createConnection();
serverSubscriber.subscribe(config.host);

export type ParsedServerMessage = {
	channel: string;
	message: {
		type: string;
		body: unknown;
	};
};

declare interface ServerEventEmitter {
	on(event: 'message', listener: (parsed: ParsedServerMessage) => void): this;
	off(event: 'message', listener: (parsed: ParsedServerMessage) => void): this;
}

class ServerEventEmitter extends EventEmitter{
	constructor() {
		super();
	}
}

export const serverEventEmitter = new ServerEventEmitter();
serverSubscriber.on('message', (_: string, data: string) => {
	const parsed = JSON.parse(data);
	serverEventEmitter.emit('message', parsed);
});
