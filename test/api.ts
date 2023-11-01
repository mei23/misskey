process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { startServer, signup, api, shutdownServer, uploadFile } from './utils';
import { PackedNote, PackedUser } from '../src/models/packed-schemas';
import { setTimeout } from 'timers/promises';

const db = require('../built/db/mongodb').default;

describe('API', () => {
	let p: childProcess.ChildProcess;

	let alice: PackedUser;
	let alicePost1: PackedNote;
	let aliceRenote1: PackedNote;
	let aliceQuote1: PackedNote;
	let aliceFile1: any;
	let aliceFileOnlyQuote1: PackedNote;
	let alicePollOnlyQuote1: PackedNote;

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

	const aliceAction = (params: Record<string, any>) => api('notes/create', params, alice);

	describe('Posts', () => {
		it('Allow 通常投稿', async () => {
			const res = await aliceAction({ text: 'post' });
			alicePost1 = res.body.createdNote;
			assert.strictEqual(alicePost1.text, 'post');
		});

		it('Allow アップロード', async () => {
			aliceFile1 = await uploadFile(alice);
			assert.strictEqual(!!aliceFile1.id, true);
		});

		// 本文なし投稿
		it('Deny 本文なし投稿', async () => {
			const res = await aliceAction({});
			assert.strictEqual(res.body.error.code, 'CONTENT_REQUIRED');
		});

		it('Allow 本文なし投稿 - ファイルのみ', async () => {
			const res = await aliceAction({ fileIds: [aliceFile1.id] });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.fileIds[0], aliceFile1.id);
		});

		it('Deny 本文なし投稿 - ファイルのみ - 0', async () => {
			const res = await aliceAction({ fileIds: [] });
			assert.strictEqual(res.body.error.info.param, 'fileIds');
		});

		it('Allow 本文なし投稿 - 投票のみ', async () => {
			const res = await aliceAction({ poll: { choices: ['a', 'b'] } });
			const obj  = res.body.createdNote;
			assert.strictEqual(!!obj.poll, true);
		});

		// Renote
		it('Allow Renote', async () => {
			const res = await aliceAction({ renoteId: alicePost1.id });
			aliceRenote1 = res.body.createdNote;
			assert.strictEqual(aliceRenote1.renoteId, alicePost1.id);
		});

		// 引用
		it('Allow 引用', async () => {
			const res = await aliceAction({ renoteId: alicePost1.id, text: 'quote' });
			aliceQuote1 = res.body.createdNote;
			assert.strictEqual(aliceQuote1.renoteId, alicePost1.id);
			assert.strictEqual(aliceQuote1.text, 'quote');
		});

		// Renote x Renote/引用
		it('Deny RenoteをRenote', async () => {
			const res = await aliceAction({ renoteId: aliceRenote1.id });
			assert.strictEqual(res.body.error.code, 'CANNOT_RENOTE_TO_A_PURE_RENOTE');
		});

		it('Allow 引用をRenote', async () => {
			const res = await aliceAction({ renoteId: aliceQuote1.id });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.renoteId, aliceQuote1.id);
		});

		// 引用 x Renote/引用
		it('Deny Renoteを引用', async () => {
			const res = await aliceAction({ renoteId: aliceRenote1.id, text: 'x' });
			assert.strictEqual(res.body.error.code, 'CANNOT_RENOTE_TO_A_PURE_RENOTE');
		});

		it('Allow 引用を引用', async () => {
			const res = await aliceAction({ renoteId: aliceQuote1.id, text: 're-quote' });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.renoteId, aliceQuote1.id);
			assert.strictEqual(obj.text, 're-quote');
		});

		// 返信
		it('Allow 返信', async () => {
			const res = await aliceAction({ replyId: alicePost1.id, text: 'reply' });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.replyId, alicePost1.id);
			assert.strictEqual(obj.text, 'reply');
		});

		// 返信 x Renote/引用
		it('Deny Renoteに返信', async () => {
			const res = await aliceAction({ replyId: aliceRenote1.id, text: 'x' });
			assert.strictEqual(res.body.error.code, 'CANNOT_REPLY_TO_A_PURE_RENOTE');
		});

		it('Allow 引用に返信', async () => {
			const res = await aliceAction({ replyId: aliceQuote1.id, text: 'reply quote' });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.replyId, aliceQuote1.id);
			assert.strictEqual(obj.text, 'reply quote');
		});

		// 本文なし系引用
		it('Allow 引用 - ファイルのみ', async () => {
			const res = await aliceAction({ renoteId: alicePost1.id, fileIds: [aliceFile1.id] });
			aliceFileOnlyQuote1 = res.body.createdNote;
			assert.strictEqual(aliceFileOnlyQuote1.renoteId, alicePost1.id);
			assert.strictEqual(aliceFileOnlyQuote1.fileIds[0], aliceFile1.id);
		});

		it('Allow 引用 - 投票のみ', async () => {
			const res = await aliceAction({ renoteId: alicePost1.id, poll: { choices: ['a', 'b'] } });
			alicePollOnlyQuote1 = res.body.createdNote;
			assert.strictEqual(alicePollOnlyQuote1.renoteId, alicePost1.id);
			assert.strictEqual(!!alicePollOnlyQuote1.poll, true);
		});

		// 本文なし系引用をRenote
		it('Allow ファイルのみ引用をRenote', async () => {
			const res = await aliceAction({ renoteId: aliceFileOnlyQuote1.id });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.renoteId, aliceFileOnlyQuote1.id);
		});

		it('Allow 投票のみ引用をRenote', async () => {
			const res = await aliceAction({ renoteId: alicePollOnlyQuote1.id });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.renoteId, alicePollOnlyQuote1.id);
		});

		// 本文なし系引用に返信
		it('Allow ファイルのみ引用に返信', async () => {
			const res = await aliceAction({ replyId: aliceFileOnlyQuote1.id, text: 'rfoq' });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.replyId, aliceFileOnlyQuote1.id);
			assert.strictEqual(obj.text, 'rfoq');
		});

		it('Allow 投票のみ引用に返信', async () => {
			const res = await aliceAction({ replyId: alicePollOnlyQuote1.id, text: 'rpoq' });
			const obj = res.body.createdNote;
			assert.strictEqual(obj.replyId, alicePollOnlyQuote1.id);
			assert.strictEqual(obj.text, 'rpoq');
		});
	});
});
