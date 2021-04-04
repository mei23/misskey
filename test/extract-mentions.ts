// TS_NODE_FILES=true npx mocha test/extract-mentions.ts --require ts-node/register

import * as assert from 'assert';

import extractMentions from '../src/misc/extract-mentions';
import { parseBasic } from '../src/mfm/parse';

describe('Extract mentions', () => {
	it('simple', () => {
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

	it('nested', () => {
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
