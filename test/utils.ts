import * as childProcess from 'child_process';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import got from 'got';
import loadConfig from '../src/config/load';
import { SIGKILL } from 'constants';
import { getHtml } from '../src/misc/fetch';
import { JSDOM } from 'jsdom';
import * as FormData from 'form-data';

export const port = loadConfig().port;

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

export function startServer(timeout = 30 * 1000): Promise<childProcess.ChildProcess> {
	return new Promise((res, rej) => {
		const t = setTimeout(() => {
			p.kill(SIGKILL);
			rej('timeout to start');
		}, timeout);

		const p = childProcess.spawn('node', [__dirname + '/../index.js'], {
			stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
			env: { NODE_ENV: 'test', PATH: process.env.PATH }
		});

		p.on('error', e => rej(e));

		p.on('message', message => {
			if (message === 'ok') {
				clearTimeout(t);
				res(p);
			}
		});
	});
}

export function shutdownServer(p: childProcess.ChildProcess, timeout = 20 * 1000) {
	return new Promise((res, rej) => {
		const t = setTimeout(() => {
			p.kill(SIGKILL);
			res('force exit');
		}, timeout);

		p.once('exit', () => {
			clearTimeout(t);
			res('exited');
		});

		p.kill();
	});
}

export const api = async (endpoint: string, params: any, me?: any): Promise<{ body: any, status: number }> => {
	const auth = me ? {
		i: me.token
	} : {};

	const res = await got<string>(`http://localhost:${port}/api/${endpoint}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(Object.assign(auth, params)),
		timeout: 30 * 1000,
		retry: 0,
		hooks: {
			beforeError: [
				error => {
					const { response } = error;
					if (response && response.body) console.warn(response.body);
					return error;
				}
			]
		},
	});

	const status = res.statusCode;
	const body = res.statusCode !== 204 ? await JSON.parse(res.body) : null;

	return {
		status,
		body
	};
};

export const signup = async (params?: any): Promise<any> => {
	const q = Object.assign({
		username: 'test',
		password: 'test'
	}, params);

	const res = await api('signup', q);

	return res.body;
};

export const post = async (user: any, params?: any): Promise<any> => {
	const q = Object.assign({
		text: 'test'
	}, params);

	const res = await api('notes/create', q, user);

	return res.body ? res.body.createdNote : null;
};

/**
 * Upload file
 * @param user User
 * @param _path Optional, absolute path or relative from ./resources/
 */
export const uploadFile = async (user: any, _path?: string): Promise<any> => {
	const absPath = _path == null ? `${__dirname}/resources/Lenna.jpg` : path.isAbsolute(_path) ? _path : `${__dirname}/resources/${_path}`;

	const formData = new FormData();
	formData.append('i', user.token);
	formData.append('file', fs.createReadStream(absPath));
	formData.append('force', 'true');

	const res = await got<string>(`http://localhost:${port}/api/drive/files/create`, {
		method: 'POST',
		body: formData,
		timeout: 30 * 1000,
		retry: 0,
	});

	const body = res.statusCode !== 204 ? await JSON.parse(res.body) : null;

	return body;
};

export const simpleGet = async (path: string, accept = '*/*'): Promise<{ status?: number, type?: string, location?: string }> => {
	// node-fetchだと3xxを取れない
	return await new Promise((resolve, reject) => {
		const req = http.request(`http://localhost:${port}${path}`, {
			headers: {
				Accept: accept
			}
		}, res => {
			if (res.statusCode! >= 400) {
				reject(res);
			} else {
				resolve({
					status: res.statusCode,
					type: res.headers['content-type'],
					location: res.headers.location,
				});
			}
		});

		req.end();
	});
};

export const getDocument = async (path: string): Promise<Document> => {
	const html = await getHtml(`http://localhost:${port}${path}`);
	const { window } = new JSDOM(html);
	const doc = window.document;
	return doc;
};
