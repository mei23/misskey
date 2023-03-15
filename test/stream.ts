/* eslint-disable node/no-unpublished-require */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, startServer, signup, shutdownServer, connectWs } from './utils';

const db = require('../built/db/mongodb').default;

describe('stream', () => {
	let p: childProcess.ChildProcess;

	let alice: any;

	before(async () => {
		p = await startServer();
		await Promise.all([
			db.get('users').drop(),
			db.get('notes').drop(),
		]);

		// alice
		alice = await signup({ username: 'alice' });
	});

	after(async () => {
		await shutdownServer(p);
	});

	describe('auth', () => {
		it('auth ok', async(async () => {
			const result = await connectWs(alice.token);
			assert.strictEqual(result, 0);
		}));

		it('auth ng', async(async () => {
			const result = await connectWs('x');
			assert.strictEqual(result, 401);
		}));

		it('anon', async(async () => {
			const result = await connectWs();
			assert.strictEqual(result, 0);
		}));
	});
});
