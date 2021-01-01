import * as childProcess from 'child_process';
import fetch from 'node-fetch';

export const async = (fn: Function) => (done: Function) => {
	fn().then(() => {
		done();
	}, (err: Error) => {
		done(err);
	});
};

export function launchServer(callbackSpawnedProcess: (p: childProcess.ChildProcess) => void, moreProcess: () => Promise<void> = async () => {}) {
	return (done: (err?: Error) => any) => {
		const p = childProcess.spawn('node', [__dirname + '/../index.js'], {
			stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
			env: { NODE_ENV: 'test', PATH: process.env.PATH }
		});
		callbackSpawnedProcess(p);
		p.on('message', message => {
			if (message === 'ok') moreProcess().then(() => done()).catch(e => done(e));
		});
	};
}

export const api = async (endpoint: string, params: any, me?: any): Promise<{ body: any, status: number }> => {
	const auth = me ? {
		i: me.token
	} : {};

	const res = await fetch('http://localhost:8010/api/' + endpoint, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(Object.assign(auth, params))
	});

	const status = res.status;
	const body = res.status !== 204 ? await res.json().catch() : null;

	return {
		status,
		body
	};
};

