process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, startServer, signup, api, shutdownServer, uploadFile } from './utils';
import { PackedNote, PackedUser } from '../src/models/packed-schemas';
import { inspect } from 'util';
import { setTimeout } from 'timers/promises';

const db = require('../built/db/mongodb').default;

describe('API', () => {
	let p: childProcess.ChildProcess;

	let alice: PackedUser;
	let alicePost1: PackedNote;
	let aliceRenote1: PackedNote;
	let aliceQuote1: PackedNote;
	let aliceFile1: any;
	let aliceFileOnlyQuote: PackedNote;
	let alicePollOnlyQuote: PackedNote;

	before(async () => {
		p = await startServer();
		await setTimeout(1000);
		await Promise.all([
			db.get('users').drop(),
			db.get('notes').drop(),
		]);
		// signup
		alice = await signup({ username: 'alice' });
		//console.log('alice', alice);
	});

	after(async () => {
		await shutdownServer(p);
	});

	describe('Posts', () => {
		// 普通の投稿
		it('Can post', async(async () => {
			const res = await api('notes/create',
				{ text: 'post' },
				alice
			);
			alicePost1 = res.body.createdNote;
			assert.strictEqual(alicePost1.text, 'post');
		}));

		it('Can upload', async(async () => {
			aliceFile1 = await uploadFile(alice);
			assert.strictEqual(!!aliceFile1.id, true);
		}));

		// textない系投稿
		it('Can fileonly post', async(async () => {
			const res = await api('notes/create',
				{ fileIds: [aliceFile1.id] },
				alice
			);
			const obj = res.body.createdNote;
			assert.strictEqual(obj.fileIds[0], aliceFile1.id);
		}));

		it('Deny 0 files post', async(async () => {
			const res = await api('notes/create',
				{ fileIds: [] },
				alice
			);
			assert.strictEqual(res.body.error.info.param, 'fileIds');
		}));

		it('Can pollonly post', async(async () => {
			const res = await api('notes/create',
				{ poll: { choices: ['a', 'b'] } },
				alice
			);
			const obj  = res.body.createdNote;
			assert.strictEqual(!!obj.poll, true);
		}));

		// Renote
		it('Can renote post', async(async () => {
			const res = await api('notes/create',
				{ renoteId: alicePost1.id },
				alice
			);
			aliceRenote1 = res.body.createdNote;
			assert.strictEqual(aliceRenote1.renoteId, alicePost1.id);
		}));

		it('Deny renote renote', async(async () => {
			const res = await api('notes/create',
				{ renoteId: aliceRenote1.id },
				alice
			);
			assert.strictEqual(res.body.error.code, 'CANNOT_RENOTE_TO_A_PURE_RENOTE');
		}));

		// 引用
		it('Can quote post', async(async () => {
			const res = await api('notes/create',
				{ renoteId: alicePost1.id, text: 'quote' },
				alice
			);
			aliceQuote1 = res.body.createdNote;
			assert.strictEqual(aliceQuote1.renoteId, alicePost1.id);
			assert.strictEqual(aliceQuote1.text, 'quote');
		}));

		it('Deny quote renote', async(async () => {
			const res = await api('notes/create',
				{ renoteId: aliceRenote1.id, text: 'x' },
				alice
			);
			assert.strictEqual(res.body.error.code, 'CANNOT_RENOTE_TO_A_PURE_RENOTE');
		}));

		it('Can quote quote', async(async () => {
			const res = await api('notes/create',
				{ renoteId: aliceQuote1.id, text: 're-quote' },
				alice
			);
			const obj = res.body.createdNote;
			assert.strictEqual(obj.renoteId, aliceQuote1.id);
			assert.strictEqual(obj.text, 're-quote');
		}));

		// textない系引用
		it('Can fileonly quote', async(async () => {
			const res = await api('notes/create',
				{ renoteId: alicePost1.id, fileIds: [aliceFile1.id] },
				alice
			);
			aliceFileOnlyQuote = res.body.createdNote;
			assert.strictEqual(aliceFileOnlyQuote.renoteId, alicePost1.id);
			assert.strictEqual(aliceFileOnlyQuote.fileIds[0], aliceFile1.id);
		}));

		it('Can pollonly quote', async(async () => {
			const res = await api('notes/create',
				{ renoteId: alicePost1.id, poll: { choices: ['a', 'b'] } },
				alice
			);
			alicePollOnlyQuote = res.body.createdNote;
			assert.strictEqual(alicePollOnlyQuote.renoteId, alicePost1.id);
			assert.strictEqual(!!alicePollOnlyQuote.poll, true);
		}));

		it('Can quote fileonly quote', async(async () => {
			const res = await api('notes/create',
				{ renoteId: aliceFileOnlyQuote.id, text: 'x' },
				alice
			);
			const obj = res.body.createdNote;
			assert.strictEqual(obj.renoteId, aliceFileOnlyQuote.id);
		}));

		it('Can quote pollonly quote', async(async () => {
			const res = await api('notes/create',
				{ renoteId: alicePollOnlyQuote.id, text: 'x' },
				alice
			);
			const obj = res.body.createdNote;
			assert.strictEqual(obj.renoteId, alicePollOnlyQuote.id);
		}));

		// reply
	});
});
