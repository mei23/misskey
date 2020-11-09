/*
 * Tests of MFM
 *
 * How to run the tests:
 * > mocha test/mfm.ts --require ts-node/register
 *
 * To specify test:
 * > mocha test/mfm.ts --require ts-node/register -g 'test name'
 */

import * as assert from 'assert';

import { parse } from '../../src/mfm/parse';
import { toHtml } from '../../src/mfm/to-html';

describe('toHtml', () => {
	it('br', () => {
		const input = 'foo\nbar\nbaz';
		const output = '<p><span>foo<br>bar<br>baz</span></p>';
		assert.equal(toHtml(parse(input)!), output);
	});

	it('br alt', () => {
		const input = 'foo\r\nbar\rbaz';
		const output = '<p><span>foo<br>bar<br>baz</span></p>';
		assert.equal(toHtml(parse(input)!), output);
	});
});
