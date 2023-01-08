import * as assert from 'assert';
import { genTypeFilterRegex, typeFilterValidater } from '../src/misc/mime-type-filter';

describe('typeFilterValidater', () => {
	it('Allow image/jpeg', () => {
		assert.strictEqual(typeFilterValidater.test('image/jpeg'), true);
	});

	it('Allow image/*', () => {
		assert.strictEqual(typeFilterValidater.test('image/*'), true);
	});

	it('Allow */*', () => {
		assert.strictEqual(typeFilterValidater.test('*/*'), true);
	});

	it('Reject image/a*', () => {
		assert.strictEqual(typeFilterValidater.test('image/a*'), false);
	});

	it('Reject image/a*b*c', () => {
		assert.strictEqual(typeFilterValidater.test('image/a*b*c'), false);
	});

	it('Reject image*/jpeg', () => {
		assert.strictEqual(typeFilterValidater.test('image*/jpeg'), false);
	});

	it('Reject */*/*', () => {
		assert.strictEqual(typeFilterValidater.test('*/*/*'), false);
	});

	it('Allow video/mp4', () => {
		assert.strictEqual(typeFilterValidater.test('video/mp4'), true);
	});

	it('Allow video/MP1S', () => {
		assert.strictEqual(typeFilterValidater.test('video/MP1S'), true);
	});

	it('Allow image/x-icon', () => {
		assert.strictEqual(typeFilterValidater.test('image/x-icon'), true);
	});
	
	it('Allow image/svg+xml', () => {
		assert.strictEqual(typeFilterValidater.test('image/svg+xml'), true);
	});

	it('Allow audio/vnd.wave', () => {
		assert.strictEqual(typeFilterValidater.test('audio/vnd.wave'), true);
	});

	it('Reject %', () => {
		assert.strictEqual(typeFilterValidater.test('image/%'), false);
	});

	it('Reject _', () => {
		assert.strictEqual(typeFilterValidater.test('image/_'), false);
	});

	it('Reject .*', () => {
		assert.strictEqual(typeFilterValidater.test('image/.*'), false);
	});

	// 難しいのでエスケープで対応する
	//it('Reject .+', () => {
	//	assert.strictEqual(typeFilterValidater.test('image/.+'), false);
	//});
});

describe('genTypeFilterRegex', () => {
	it('image/jpeg', () => {
		assert.strictEqual(genTypeFilterRegex('image/jpeg').source, '^image[/]jpeg$');
	});

	it('image/*', () => {
		assert.strictEqual(genTypeFilterRegex('image/*').source, '^image[/][^/]+$');
	});

	it('*/*', () => {
		assert.strictEqual(genTypeFilterRegex('*/*').source, '^[^/]+[/][^/]+$');
	});

	it('image/.+', () => {
		assert.strictEqual(genTypeFilterRegex('image/.+').source, '^image[/]\\.\\+$');
	});
});
