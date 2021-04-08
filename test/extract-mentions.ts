import * as assert from 'assert';

import extractMentions from '../src/misc/extract-mentions';
import { parseFull, parseBasic } from '../src/mfm/parse';

describe('Extract mentions', () => {
	it('simple', () => {
		const ast = parseFull('@foo @bar @baz')!;
		const mentions = extractMentions(ast);
		assert.deepStrictEqual(mentions, [{
			username: 'foo',
			acct: '@foo',
			canonical: '@foo',
			host: null
		}, {
			username: 'bar',
			acct: '@bar',
			canonical: '@bar',
			host: null
		}, {
			username: 'baz',
			acct: '@baz',
			canonical: '@baz',
			host: null
		}]);
	});

	it('nested', () => {
		const ast = parseFull('@foo **@bar** @baz')!;
		const mentions = extractMentions(ast);
		assert.deepStrictEqual(mentions, [{
			username: 'foo',
			acct: '@foo',
			canonical: '@foo',
			host: null
		}, {
			username: 'bar',
			acct: '@bar',
			canonical: '@bar',
			host: null
		}, {
			username: 'baz',
			acct: '@baz',
			canonical: '@baz',
			host: null
		}]);
	});

	it('simple basic', () => {
		const ast = parseBasic('@foo @bar @baz')!;
		const mentions = extractMentions(ast);
		assert.deepStrictEqual(mentions, [{
			username: 'foo',
			acct: '@foo',
			canonical: '@foo',
			host: null
		}, {
			username: 'bar',
			acct: '@bar',
			canonical: '@bar',
			host: null
		}, {
			username: 'baz',
			acct: '@baz',
			canonical: '@baz',
			host: null
		}]);
	});

	it('nested basic', () => {
		const ast = parseBasic('@foo **@bar** @baz')!;
		const mentions = extractMentions(ast);
		assert.deepStrictEqual(mentions, [{
			username: 'foo',
			acct: '@foo',
			canonical: '@foo',
			host: null
		}, {
			username: 'bar',
			acct: '@bar',
			canonical: '@bar',
			host: null
		}, {
			username: 'baz',
			acct: '@baz',
			canonical: '@baz',
			host: null
		}]);
	});
});
