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

import { parseFull, parsePlain, parseBasic } from '../src/mfm/parse';
import { createMfmNode } from '../src/mfm/utils';
import { MfmNode } from '../src/mfm/types';
import { removeOrphanedBrackets } from '../src/mfm/language';
import { fromHtml } from '../src/mfm/from-html';
import { toHtml } from '../src/mfm/to-html';
import { extractMentions } from '../src/mfm/extract-mentions';
import { extractHashtags } from '../src/mfm/extract-hashtags';
import { extractEmojis } from '../src/mfm/extract-emojis';

function text(text: string): MfmNode {
	return createMfmNode('text', { text });
}

function tree(type: string, children: any[], props: any) {
	return createMfmNode(type, props, children);
}

function leaf(type: string, props: any) {
	return createMfmNode(type, props);
}

describe('createMfmNode', () => {
	it('without children', () => {
		assert.deepStrictEqual(createMfmNode('text', { text: 'abc' }), {
			type: 'text',
			props: {
				text: 'abc'
			},
			children: [],
		});
	});

	it('with children', () => {
		const t = createMfmNode('tree', { c: 4 },
			[
				createMfmNode('left', { a: 2 }),
				createMfmNode('right', { b: 'hi' })
			]);

		assert.deepStrictEqual(t, {
			type: 'tree',
			props: {
				c: 4
			},
			children: [
				{ type: 'left', props: { a: 2 }, children: [] },
				{ type: 'right', props: { b: 'hi' }, children: [] },
			],
		});
	});
});

describe('removeOrphanedBrackets', () => {
	it('single (contained)', () => {
		const input = '(foo)';
		const expected = '(foo)';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('single (head)', () => {
		const input = '(foo)bar';
		const expected = '(foo)bar';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('single (tail)', () => {
		const input = 'foo(bar)';
		const expected = 'foo(bar)';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('a', () => {
		const input = '(foo';
		const expected = '';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('b', () => {
		const input = ')foo';
		const expected = '';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('nested', () => {
		const input = 'foo(「(bar)」)';
		const expected = 'foo(「(bar)」)';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('no brackets', () => {
		const input = 'foo';
		const expected = 'foo';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('with foreign bracket (single)', () => {
		const input = 'foo(bar))';
		const expected = 'foo(bar)';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('with foreign bracket (open)', () => {
		const input = 'foo(bar';
		const expected = 'foo';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('with foreign bracket (close)', () => {
		const input = 'foo)bar';
		const expected = 'foo';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('with foreign bracket (close and open)', () => {
		const input = 'foo)(bar';
		const expected = 'foo';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('various bracket type', () => {
		const input = 'foo「(bar)」(';
		const expected = 'foo「(bar)」';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});

	it('intersected', () => {
		const input = 'foo(「)」';
		const expected = 'foo(「)」';
		const actual = removeOrphanedBrackets(input);
		assert.deepStrictEqual(actual, expected);
	});
});

describe('parse', () => {
	it('can be analyzed', () => {
		const tokens = parseFull('@himawari @hima_sub@namori.net お腹ペコい :cat: #yryr');
		assert.deepStrictEqual(tokens, [
			leaf('mention', {
				acct: '@himawari',
				canonical: '@himawari',
				username: 'himawari',
				host: null
			}),
			text(' '),
			leaf('mention', {
				acct: '@hima_sub@namori.net',
				canonical: '@hima_sub@namori.net',
				username: 'hima_sub',
				host: 'namori.net'
			}),
			text(' お腹ペコい '),
			leaf('emoji', { name: 'cat' }),
			text(' '),
			leaf('hashtag', { hashtag: 'yryr' }),
		]);
	});

	describe('elements', () => {
		describe('bold', () => {
			it('simple', () => {
				const tokens = parseFull('**foo**');
				assert.deepStrictEqual(tokens, [
					tree('bold', [
						text('foo')
					], {}),
				]);
			});

			it('with other texts', () => {
				const tokens = parseFull('bar**foo**bar');
				assert.deepStrictEqual(tokens, [
					text('bar'),
					tree('bold', [
						text('foo')
					], {}),
					text('bar'),
				]);
			});

			it('with underscores', () => {
				const tokens = parseFull('__foo__');
				assert.deepStrictEqual(tokens, [
					tree('bold', [
						text('foo')
					], {}),
				]);
			});

			it('with underscores (ensure it allows alphabet only)', () => {
				const tokens = parseFull('(=^・__________・^=)');
				assert.deepStrictEqual(tokens, [
					text('(=^・__________・^=)')
				]);
			});

			it('mixed syntax', () => {
				const tokens = parseFull('**foo__');
				assert.deepStrictEqual(tokens, [
						text('**foo__'),
				]);
			});

			it('mixed syntax', () => {
				const tokens = parseFull('__foo**');
				assert.deepStrictEqual(tokens, [
						text('__foo**'),
				]);
			});
		});

		it('big', () => {
			const tokens = parseFull('***Strawberry*** Pasta');
			assert.deepStrictEqual(tokens, [
				tree('big', [
					text('Strawberry')
				], {}),
				text(' Pasta'),
			]);
		});

		it('small', () => {
			const tokens = parseFull('<small>smaller</small>');
			assert.deepStrictEqual(tokens, [
				tree('small', [
					text('smaller')
				], {}),
			]);
		});

		it('flip', () => {
			const tokens = parseFull('<flip>foo</flip>');
			assert.deepStrictEqual(tokens, [
				tree('flip', [
					text('foo')
				], {}),
			]);
		});

		it('vflip', () => {
			const tokens = parseFull('<vflip>foo</vflip>');
			assert.deepStrictEqual(tokens, [
				tree('vflip', [
					text('foo')
				], {}),
			]);
		});

		it('rotate', () => {
			const tokens = parseFull('<rotate 90>foo</rotate>');
			assert.deepStrictEqual(tokens, [
				tree('rotate', [
					text('foo')
				], {
					attr: '90'
				}),
			]);
		});

		describe('spin', () => {
			it('text', () => {
				const tokens = parseFull('<spin>foo</spin>');
				assert.deepStrictEqual(tokens, [
					tree('spin', [
						text('foo')
					], {
						attr: null
					}),
				]);
			});

			it('かっこ', () => {
				const tokens = parseFull('[[[foo]]]');
				assert.deepStrictEqual(tokens, [
					tree('spin', [
						text('foo')
					], {
						attr: null
					}),
				]);
			});

			it('emoji', () => {
				const tokens = parseFull('<spin>:foo:</spin>');
				assert.deepStrictEqual(tokens, [
					tree('spin', [
						leaf('emoji', { name: 'foo' })
					], {
						attr: null
					}),
				]);
			});

			it('with attr', () => {
				const tokens = parseFull('<spin left>:foo:</spin>');
				assert.deepStrictEqual(tokens, [
					tree('spin', [
						leaf('emoji', { name: 'foo' })
					], {
						attr: 'left'
					}),
				]);
			});
		});

		it('jump', () => {
			const tokens = parseFull('<jump>:foo:</jump>');
			assert.deepStrictEqual(tokens, [
				tree('jump', [
					leaf('emoji', { name: 'foo' })
				], {}),
			]);
		});

		it('jump かっこ', () => {
			const tokens = parseFull('{{{foo}}}');
			assert.deepStrictEqual(tokens, [
				tree('jump', [
					text('foo')
				], {}),
			]);
		});

		describe('motion', () => {
			it('by triple brackets', () => {
				const tokens = parseFull('(((foo)))');
				assert.deepStrictEqual(tokens, [
					tree('motion', [
						text('foo')
					], {}),
				]);
			});

			it('by triple brackets (with other texts)', () => {
				const tokens = parseFull('bar(((foo)))bar');
				assert.deepStrictEqual(tokens, [
					text('bar'),
					tree('motion', [
						text('foo')
					], {}),
					text('bar'),
				]);
			});

			it('by <motion> tag', () => {
				const tokens = parseFull('<motion>foo</motion>');
				assert.deepStrictEqual(tokens, [
					tree('motion', [
						text('foo')
					], {}),
				]);
			});

			it('by <motion> tag (with other texts)', () => {
				const tokens = parseFull('bar<motion>foo</motion>bar');
				assert.deepStrictEqual(tokens, [
					text('bar'),
					tree('motion', [
						text('foo')
					], {}),
					text('bar'),
				]);
			});
		});

		describe('mention', () => {
			it('local', () => {
				const tokens = parseFull('@himawari foo');
				assert.deepStrictEqual(tokens, [
					leaf('mention', {
						acct: '@himawari',
						canonical: '@himawari',
						username: 'himawari',
						host: null
					}),
					text(' foo')
				]);
			});

			it('remote', () => {
				const tokens = parseFull('@hima_sub@namori.net foo');
				assert.deepStrictEqual(tokens, [
					leaf('mention', {
						acct: '@hima_sub@namori.net',
						canonical: '@hima_sub@namori.net',
						username: 'hima_sub',
						host: 'namori.net'
					}),
					text(' foo')
				]);
			});

			it('remote punycode', () => {
				const tokens = parseFull('@hima_sub@xn--q9j5bya.xn--zckzah foo');
				assert.deepStrictEqual(tokens, [
					leaf('mention', {
						acct: '@hima_sub@xn--q9j5bya.xn--zckzah',
						canonical: '@hima_sub@なもり.テスト',
						username: 'hima_sub',
						host: 'xn--q9j5bya.xn--zckzah'
					}),
					text(' foo')
				]);
			});

			it('ignore', () => {
				const tokens = parseFull('idolm@ster');
				assert.deepStrictEqual(tokens, [
					text('idolm@ster')
				]);

				const tokens2 = parseFull('@a\n@b\n@c');
				assert.deepStrictEqual(tokens2, [
					leaf('mention', {
						acct: '@a',
						canonical: '@a',
						username: 'a',
						host: null
					}),
					text('\n'),
					leaf('mention', {
						acct: '@b',
						canonical: '@b',
						username: 'b',
						host: null
					}),
					text('\n'),
					leaf('mention', {
						acct: '@c',
						canonical: '@c',
						username: 'c',
						host: null
					})
				]);

				const tokens3 = parseFull('**x**@a');
				assert.deepStrictEqual(tokens3, [
					tree('bold', [
						text('x')
					], {}),
					text('@a')
				]);

				const tokens4 = parseFull('@\n@v\n@veryverylongusername');
				assert.deepStrictEqual(tokens4, [
					text('@\n'),
					leaf('mention', {
						acct: '@v',
						canonical: '@v',
						username: 'v',
						host: null
					}),
					text('\n'),
					leaf('mention', {
						acct: '@veryverylongusername',
						canonical: '@veryverylongusername',
						username: 'veryverylongusername',
						host: null
					}),
				]);
			});
		});

		describe('hashtag', () => {
			it('simple', () => {
				const tokens = parseFull('#alice');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'alice' })
				]);
			});

			it('after line break', () => {
				const tokens = parseFull('foo\n#alice');
				assert.deepStrictEqual(tokens, [
					text('foo\n'),
					leaf('hashtag', { hashtag: 'alice' })
				]);
			});

			it('with text', () => {
				const tokens = parseFull('Strawberry Pasta #alice');
				assert.deepStrictEqual(tokens, [
					text('Strawberry Pasta '),
					leaf('hashtag', { hashtag: 'alice' })
				]);
			});

			it('with text (zenkaku)', () => {
				const tokens = parseFull('こんにちは#世界');
				assert.deepStrictEqual(tokens, [
					text('こんにちは#世界')
				]);
			});

			it('ignore comma and period', () => {
				const tokens = parseFull('Foo #bar, baz #piyo.');
				assert.deepStrictEqual(tokens, [
					text('Foo '),
					leaf('hashtag', { hashtag: 'bar' }),
					text(', baz '),
					leaf('hashtag', { hashtag: 'piyo' }),
					text('.'),
				]);
			});

			it('ignore exclamation mark', () => {
				const tokens = parseFull('#Foo!');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'Foo' }),
					text('!'),
				]);
			});

			it('ignore colon', () => {
				const tokens = parseFull('#Foo:');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'Foo' }),
					text(':'),
				]);
			});

			it('ignore single quote', () => {
				const tokens = parseFull('#foo\'');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'foo' }),
					text('\''),
				]);
			});

			it('ignore double quote', () => {
				const tokens = parseFull('#foo"');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'foo' }),
					text('"'),
				]);
			});

			it('ignore square brackets', () => {
				const tokens = parseFull('#foo]');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'foo' }),
					text(']'),
				]);
			});

			it('allow including number', () => {
				const tokens = parseFull('#foo123');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'foo123' }),
				]);
			});

			it('with brackets', () => {
				const tokens1 = parseFull('(#foo)');
				assert.deepStrictEqual(tokens1, [
					text('(#foo)')
				]);
			});

			it('with brackets (space before)', () => {
				const tokens1 = parseFull('(bar #foo)');
				assert.deepStrictEqual(tokens1, [
					text('(bar '),
					leaf('hashtag', { hashtag: 'foo' }),
					text(')'),
				]);
			});

			it('ignore slash', () => {
				const tokens = parseFull('#foo/bar');
				assert.deepStrictEqual(tokens, [
					leaf('hashtag', { hashtag: 'foo' }),
					text('/bar'),
				]);
			});

			it('ignore Keycap Number Sign (U+0023 + U+20E3)', () => {
				const tokens = parseFull('#⃣');
				assert.deepStrictEqual(tokens, [
					leaf('emoji', { emoji: '#⃣' })
				]);
			});

			it('ignore Keycap Number Sign (U+0023 + U+FE0F + U+20E3)', () => {
				const tokens = parseFull('#️⃣');
				assert.deepStrictEqual(tokens, [
					leaf('emoji', { emoji: '#️⃣' })
				]);
			});
		});

		describe('quote', () => {
			it('basic', () => {
				const tokens1 = parseFull('> foo');
				assert.deepStrictEqual(tokens1, [
					tree('quote', [
						text('foo')
					], {})
				]);

				const tokens2 = parseFull('>foo');
				assert.deepStrictEqual(tokens2, [
					tree('quote', [
						text('foo')
					], {})
				]);
			});

			it('series', () => {
				const tokens = parseFull('> foo\n\n> bar');
				assert.deepStrictEqual(tokens, [
					tree('quote', [
						text('foo')
					], {}),
					text('\n'),
					tree('quote', [
						text('bar')
					], {}),
				]);
			});

			it('trailing line break', () => {
				const tokens1 = parseFull('> foo\n');
				assert.deepStrictEqual(tokens1, [
					tree('quote', [
						text('foo')
					], {}),
				]);

				const tokens2 = parseFull('> foo\n\n');
				assert.deepStrictEqual(tokens2, [
					tree('quote', [
						text('foo')
					], {}),
					text('\n')
				]);
			});

			it('multiline', () => {
				const tokens1 = parseFull('>foo\n>bar');
				assert.deepStrictEqual(tokens1, [
					tree('quote', [
						text('foo\nbar')
					], {})
				]);

				const tokens2 = parseFull('> foo\n> bar');
				assert.deepStrictEqual(tokens2, [
					tree('quote', [
						text('foo\nbar')
					], {})
				]);
			});

			it('multiline with trailing line break', () => {
				const tokens1 = parseFull('> foo\n> bar\n');
				assert.deepStrictEqual(tokens1, [
					tree('quote', [
						text('foo\nbar')
					], {}),
				]);

				const tokens2 = parseFull('> foo\n> bar\n\n');
				assert.deepStrictEqual(tokens2, [
					tree('quote', [
						text('foo\nbar')
					], {}),
					text('\n')
				]);
			});

			it('with before and after texts', () => {
				const tokens = parseFull('before\n> foo\nafter');
				assert.deepStrictEqual(tokens, [
					text('before\n'),
					tree('quote', [
						text('foo')
					], {}),
					text('after'),
				]);
			});

			it('multiple quotes', () => {
				const tokens = parseFull('> foo\nbar\n\n> foo\nbar\n\n> foo\nbar');
				assert.deepStrictEqual(tokens, [
					tree('quote', [
						text('foo')
					], {}),
					text('bar\n\n'),
					tree('quote', [
						text('foo')
					], {}),
					text('bar\n\n'),
					tree('quote', [
						text('foo')
					], {}),
					text('bar'),
				]);
			});

			it('require line break before ">"', () => {
				const tokens = parseFull('foo>bar');
				assert.deepStrictEqual(tokens, [
					text('foo>bar'),
				]);
			});

			it('nested', () => {
				const tokens = parseFull('>> foo\n> bar');
				assert.deepStrictEqual(tokens, [
					tree('quote', [
						tree('quote', [
							text('foo')
						], {}),
						text('bar')
					], {})
				]);
			});

			it('trim line breaks', () => {
				const tokens = parseFull('foo\n\n>a\n>>b\n>>\n>>>\n>>>c\n>>>\n>d\n\n');
				assert.deepStrictEqual(tokens, [
					text('foo\n\n'),
					tree('quote', [
						text('a\n'),
						tree('quote', [
							text('b\n\n'),
							tree('quote', [
								text('\nc\n')
							], {})
						], {}),
						text('d')
					], {}),
					text('\n'),
				]);
			});
		});

		describe('url', () => {
			it('simple', () => {
				const tokens = parseFull('https://example.com');
				assert.deepStrictEqual(tokens, [
					leaf('url', { url: 'https://example.com' })
				]);
			});

			it('ignore trailing period', () => {
				const tokens = parseFull('https://example.com.');
				assert.deepStrictEqual(tokens, [
					leaf('url', { url: 'https://example.com' }),
					text('.')
				]);
			});

			it('ignore trailing periods', () => {
				const tokens = parseFull('https://example.com...');
				assert.deepStrictEqual(tokens, [
					leaf('url', { url: 'https://example.com' }),
					text('...')
				]);
			});

			it('with comma', () => {
				const tokens = parseFull('https://example.com/foo?bar=a,b');
				assert.deepStrictEqual(tokens, [
					leaf('url', { url: 'https://example.com/foo?bar=a,b' })
				]);
			});

			it('ignore trailing comma', () => {
				const tokens = parseFull('https://example.com/foo, bar');
				assert.deepStrictEqual(tokens, [
					leaf('url', { url: 'https://example.com/foo' }),
					text(', bar')
				]);
			});

			it('with brackets', () => {
				const tokens = parseFull('https://example.com/foo(bar)');
				assert.deepStrictEqual(tokens, [
					leaf('url', { url: 'https://example.com/foo(bar)' })
				]);
			});

			it('ignore parent brackets', () => {
				const tokens = parseFull('(https://example.com/foo)');
				assert.deepStrictEqual(tokens, [
					text('('),
					leaf('url', { url: 'https://example.com/foo' }),
					text(')')
				]);
			});

			it('ignore parent []', () => {
				const tokens = parseFull('foo [https://example.com/foo] bar');
				assert.deepStrictEqual(tokens, [
					text('foo ['),
					leaf('url', { url: 'https://example.com/foo' }),
					text('] bar')
				]);
			});

			it('ignore parent brackets 2', () => {
				const tokens = parseFull('(foo https://example.com/foo)');
				assert.deepStrictEqual(tokens, [
					text('(foo '),
					leaf('url', { url: 'https://example.com/foo' }),
					text(')')
				]);
			});

			it('ignore parent brackets with internal brackets', () => {
				const tokens = parseFull('(https://example.com/foo(bar))');
				assert.deepStrictEqual(tokens, [
					text('('),
					leaf('url', { url: 'https://example.com/foo(bar)' }),
					text(')')
				]);
			});

			it('ignore non-ascii characters contained url without angle brackets', () => {
				const tokens = parseFull('https://大石泉すき.example.com');
				assert.deepStrictEqual(tokens, [
					text('https://大石泉すき.example.com')
				]);
			});

			it('match non-ascii characters contained url with angle brackets', () => {
				const tokens = parseFull('<https://大石泉すき.example.com>');
				assert.deepStrictEqual(tokens, [
					leaf('url', { url: 'https://大石泉すき.example.com' })
				]);
			});
		});

		describe('link', () => {
			it('simple', () => {
				const tokens = parseFull('[foo](https://example.com)');
				assert.deepStrictEqual(tokens, [
					tree('link', [
						text('foo')
					], { url: 'https://example.com', silent: false })
				]);
			});

			it('simple (with silent flag)', () => {
				const tokens = parseFull('?[foo](https://example.com)');
				assert.deepStrictEqual(tokens, [
					tree('link', [
						text('foo')
					], { url: 'https://example.com', silent: true })
				]);
			});

			it('in text', () => {
				const tokens = parseFull('before[foo](https://example.com)after');
				assert.deepStrictEqual(tokens, [
					text('before'),
					tree('link', [
						text('foo')
					], { url: 'https://example.com', silent: false }),
					text('after'),
				]);
			});

			it('with brackets', () => {
				const tokens = parseFull('[foo](https://example.com/foo(bar))');
				assert.deepStrictEqual(tokens, [
					tree('link', [
						text('foo')
					], { url: 'https://example.com/foo(bar)', silent: false })
				]);
			});

			it('with parent brackets', () => {
				const tokens = parseFull('([foo](https://example.com/foo(bar)))');
				assert.deepStrictEqual(tokens, [
					text('('),
					tree('link', [
						text('foo')
					], { url: 'https://example.com/foo(bar)', silent: false }),
					text(')')
				]);
			});

			it('allow inconsistent parentheses within angle brackets', () => {
				const tokens = parseFull('<https://example.com/foo(>');
				assert.deepStrictEqual(tokens, [
					tree('url', [], { url: 'https://example.com/foo(' }),
				]);
			});

			it('allow inconsistent parentheses within angle brackets (for link label)', () => {
				const tokens = parseFull('[foo](<https://example.com/foo(>)');
				assert.deepStrictEqual(tokens, [
					tree('link', [
						text('foo')
					], { url: 'https://example.com/foo(', silent: false }),
				]);
			});

			it('allow trailing period within angle brackets', () => {
				const tokens = parseFull('<https://example.com/foo.>');
				assert.deepStrictEqual(tokens, [
					tree('url', [], { url: 'https://example.com/foo.' }),
				]);
			});

			it('allow trailing period within angle brackets (for link label)', () => {
				const tokens = parseFull('[foo](<https://example.com/foo.>)');
				assert.deepStrictEqual(tokens, [
					tree('link', [
						text('foo')
					], { url: 'https://example.com/foo.', silent: false }),
				]);
			});

			it('disallow non http URLs <>', () => {
				const tokens = parseFull('<ftp://example.com/>');
				assert.deepStrictEqual(tokens, [
					text('<ftp://example.com/>'),
				]);
			});

			it('disallow non URLs <>', () => {
				const tokens = parseFull('<foo>');
				assert.deepStrictEqual(tokens, [
					text('<foo>'),
				]);
			});

			it('disallow non http URLs []()', () => {
				const tokens = parseFull('[foo](ftp://example.com/)');
				assert.deepStrictEqual(tokens, [
					text('[foo](ftp://example.com/)'),
				]);
			});

			it('disallow non URLs []()', () => {
				const tokens = parseFull('[foo](foo)');
				assert.deepStrictEqual(tokens, [
					text('[foo](foo)'),
				]);
			});

			it('disallow non http URLs [](<>)', () => {
				const tokens = parseFull('[foo](<ftp://example.com/>)');
				assert.deepStrictEqual(tokens, [
					text('[foo](<ftp://example.com/>)'),
				]);
			});

			it('disallow non URLs [](<>)', () => {
				const tokens = parseFull('[foo](<foo>)');
				assert.deepStrictEqual(tokens, [
					text('[foo](<foo>)'),
				]);
			});
		});

		it('emoji', () => {
			const tokens1 = parseFull(':cat:');
			assert.deepStrictEqual(tokens1, [
				leaf('emoji', { name: 'cat' })
			]);

			const tokens2 = parseFull(':cat::cat::cat:');
			assert.deepStrictEqual(tokens2, [
				leaf('emoji', { name: 'cat' }),
				leaf('emoji', { name: 'cat' }),
				leaf('emoji', { name: 'cat' })
			]);

			const tokens3 = parseFull('🍎');
			assert.deepStrictEqual(tokens3, [
				leaf('emoji', { emoji: '🍎' })
			]);
		});

		describe('block code', () => {
			it('simple', () => {
				const tokens = parseFull('```\nvar x = "Strawberry Pasta";\n```');
				assert.deepStrictEqual(tokens, [
					leaf('blockCode', { code: 'var x = "Strawberry Pasta";', lang: null })
				]);
			});

			it('can specify language', () => {
				const tokens = parseFull('``` json\n{ "x": 42 }\n```');
				assert.deepStrictEqual(tokens, [
					leaf('blockCode', { code: '{ "x": 42 }', lang: 'json' })
				]);
			});

			it('require line break before "```"', () => {
				const tokens = parseFull('before```\nfoo\n```');
				assert.deepStrictEqual(tokens, [
					text('before'),
					leaf('inlineCode', { code: '`' }),
					text('\nfoo\n'),
					leaf('inlineCode', { code: '`' })
				]);
			});

			it('series', () => {
				const tokens = parseFull('```\nfoo\n```\n```\nbar\n```\n```\nbaz\n```');
				assert.deepStrictEqual(tokens, [
					leaf('blockCode', { code: 'foo', lang: null }),
					leaf('blockCode', { code: 'bar', lang: null }),
					leaf('blockCode', { code: 'baz', lang: null }),
				]);
			});

			it('ignore internal marker', () => {
				const tokens = parseFull('```\naaa```bbb\n```');
				assert.deepStrictEqual(tokens, [
					leaf('blockCode', { code: 'aaa```bbb', lang: null })
				]);
			});

			it('trim after line break', () => {
				const tokens = parseFull('```\nfoo\n```\nbar');
				assert.deepStrictEqual(tokens, [
					leaf('blockCode', { code: 'foo', lang: null }),
					text('bar')
				]);
			});
		});

		describe('inline code', () => {
			it('simple', () => {
				const tokens = parseFull('`var x = "Strawberry Pasta";`');
				assert.deepStrictEqual(tokens, [
					leaf('inlineCode', { code: 'var x = "Strawberry Pasta";' })
				]);
			});

			it('disallow line break', () => {
				const tokens = parseFull('`foo\nbar`');
				assert.deepStrictEqual(tokens, [
					text('`foo\nbar`')
				]);
			});

			it('disallow ´', () => {
				const tokens = parseFull('`foo´bar`');
				assert.deepStrictEqual(tokens, [
					text('`foo´bar`')
				]);
			});
		});

		it('mathInline', () => {
			const fomula = 'x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}';
			const content = `\\(${fomula}\\)`;
			const tokens = parseFull(content);
			assert.deepStrictEqual(tokens, [
				leaf('mathInline', { formula: fomula })
			]);
		});

		describe('mathBlock', () => {
			it('simple', () => {
				const fomula = 'x = {-b \\pm \\sqrt{b^2-4ac} \\over 2a}';
				const content = `\\[\n${fomula}\n\\]`;
				const tokens = parseFull(content);
				assert.deepStrictEqual(tokens, [
					leaf('mathBlock', { formula: fomula })
				]);
			});
		});

		it('search', () => {
			const tokens1 = parseFull('a b c 検索');
			assert.deepStrictEqual(tokens1, [
				leaf('search', { content: 'a b c 検索', query: 'a b c' })
			]);

			const tokens2 = parseFull('a b c Search');
			assert.deepStrictEqual(tokens2, [
				leaf('search', { content: 'a b c Search', query: 'a b c' })
			]);

			const tokens3 = parseFull('a b c search');
			assert.deepStrictEqual(tokens3, [
				leaf('search', { content: 'a b c search', query: 'a b c' })
			]);

			const tokens4 = parseFull('a b c SEARCH');
			assert.deepStrictEqual(tokens4, [
				leaf('search', { content: 'a b c SEARCH', query: 'a b c' })
			]);
		});

		describe('title', () => {
			it('simple', () => {
				const tokens = parseFull('【foo】');
				assert.deepStrictEqual(tokens, [
					tree('title', [
						text('foo')
					], {})
				]);
			});

			it('require line break', () => {
				const tokens = parseFull('a【foo】');
				assert.deepStrictEqual(tokens, [
					text('a【foo】')
				]);
			});

			it('with before and after texts', () => {
				const tokens = parseFull('before\n【foo】\nafter');
				assert.deepStrictEqual(tokens, [
					text('before\n'),
					tree('title', [
						text('foo')
					], {}),
					text('after')
				]);
			});

			it('ignore multiple title blocks', () => {
				const tokens = parseFull('【foo】bar【baz】');
				assert.deepStrictEqual(tokens, [
					text('【foo】bar【baz】')
				]);
			});

			it('disallow linebreak in title', () => {
				const tokens = parseFull('【foo\nbar】');
				assert.deepStrictEqual(tokens, [
					text('【foo\nbar】')
				]);
			});
		});

		describe('center', () => {
			it('simple', () => {
				const tokens = parseFull('<center>foo</center>');
				assert.deepStrictEqual(tokens, [
					tree('center', [
						text('foo')
					], {}),
				]);
			});
		});

		describe('strike', () => {
			it('simple', () => {
				const tokens = parseFull('~~foo~~');
				assert.deepStrictEqual(tokens, [
					tree('strike', [
						text('foo')
					], {}),
				]);
			});

			// docker~~~~~~
			it('ignore internal tilde', () => {
				const tokens = parseFull('~~~~~');
				assert.deepStrictEqual(tokens, [
					text('~~~~~')
				]);
			});
		});

		describe('italic', () => {
			it('<i>', () => {
				const tokens = parseFull('<i>foo</i>');
				assert.deepStrictEqual(tokens, [
					tree('italic', [
						text('foo')
					], {}),
				]);
			});

			it('underscore', () => {
				const tokens = parseFull('_foo_');
				assert.deepStrictEqual(tokens, [
					tree('italic', [
						text('foo')
					], {}),
				]);
			});

			it('simple with asterix', () => {
				const tokens = parseFull('*foo*');
				assert.deepStrictEqual(tokens, [
					tree('italic', [
						text('foo')
					], {}),
				]);
			});

			it('exlude emotes', () => {
				const tokens = parseFull('*.*');
				assert.deepStrictEqual(tokens, [
					text('*.*'),
				]);
			});

			it('mixed', () => {
				const tokens = parseFull('_foo*');
				assert.deepStrictEqual(tokens, [
					text('_foo*'),
				]);
			});

			it('mixed', () => {
				const tokens = parseFull('*foo_');
				assert.deepStrictEqual(tokens, [
					text('*foo_'),
				]);
			});

			it('ignore snake_case string', () => {
				const tokens = parseFull('foo_bar_baz');
				assert.deepStrictEqual(tokens, [
					text('foo_bar_baz'),
				]);
			});

			it('require spaces', () => {
				const tokens = parseFull('４日目_L38b a_b');
				assert.deepStrictEqual(tokens, [
					text('４日目_L38b a_b'),
				]);
			});

			it('newline sandwich', () => {
				const tokens = parseFull('foo\n_bar_\nbaz');
				assert.deepStrictEqual(tokens, [
					text('foo\n'),
					tree('italic', [
						text('bar')
					], {}),
					text('\nbaz'),
				]);
			});
		});
	});

	describe('plainText', () => {
		it('text', () => {
			const tokens = parsePlain('foo');
			assert.deepStrictEqual(tokens, [
				text('foo'),
			]);
		});

		it('emoji', () => {
			const tokens = parsePlain(':foo:');
			assert.deepStrictEqual(tokens, [
				leaf('emoji', { name: 'foo' })
			]);
		});

		it('emoji in text', () => {
			const tokens = parsePlain('foo:bar:baz');
			assert.deepStrictEqual(tokens, [
				text('foo'),
				leaf('emoji', { name: 'bar' }),
				text('baz'),
			]);
		});

		it('disallow other syntax', () => {
			const tokens = parsePlain('foo **bar** baz');
			assert.deepStrictEqual(tokens, [
				text('foo **bar** baz'),
			]);
		});
	});

	it('code block with quote', () => {
		const tokens = parseFull('> foo\n```\nbar\n```');
		assert.deepStrictEqual(tokens, [
			tree('quote', [
				text('foo')
			], {}),
			leaf('blockCode', { code: 'bar', lang: null })
		]);
	});

	it('quote between two code blocks', () => {
		const tokens = parseFull('```\nbefore\n```\n> foo\n```\nafter\n```');
		assert.deepStrictEqual(tokens, [
			leaf('blockCode', { code: 'before', lang: null }),
			tree('quote', [
				text('foo')
			], {}),
			leaf('blockCode', { code: 'after', lang: null })
		]);
	});
});

describe('fromHtml', () => {
	it('p', () => {
		assert.deepStrictEqual(fromHtml('<p>a</p><p>b</p>'), 'a\n\nb');
	});

	it('block element', () => {
		assert.deepStrictEqual(fromHtml('<div>a</div><div>b</div>'), 'a\nb');
	});

	it('inline element', () => {
		assert.deepStrictEqual(fromHtml('<ul><li>a</li><li>b</li></ul>'), 'a\nb');
	});

	it('block code', () => {
		assert.deepStrictEqual(fromHtml('<pre><code>a\nb</code></pre>'), '```\na\nb\n```');
	});

	it('inline code', () => {
		assert.deepStrictEqual(fromHtml('<code>a</code>'), '`a`');
	});

	it('quote', () => {
		assert.deepStrictEqual(fromHtml('<blockquote>a\nb</blockquote>'), '> a\n> b');
	});

	it('br', () => {
		assert.deepStrictEqual(fromHtml('<p>abc<br><br/>d</p>'), 'abc\n\nd');
	});

	it('link with different text', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/b">c</a> d</p>'), 'a [c](https://example.com/b) d');
	});

	it('link with different text, but not encoded', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/ä">c</a> d</p>'), 'a [c](https://example.com/%C3%A4) d');
	});

	it('link with different text, but ()', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/(">c</a> d</p>'), 'a [c](https://example.com/%28) d');
	});

	it('link with same text', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/b">https://example.com/b</a> d</p>'), 'a https://example.com/b d');
	});

	it('link with same text, but not encoded', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/ä">https://example.com/ä</a> d</p>'), 'a [https://example.com/ä](https://example.com/%C3%A4) d');
	});

	it('link with no url', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="b">c</a> d</p>'), 'a c d');
	});

	it('link without href', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a>c</a> d</p>'), 'a c d');
	});

	it('link without text', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/b"></a> d</p>'), 'a https://example.com/b d');
	});

	it('link without both', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a></a> d</p>'), 'a  d');
	});

	it('mention', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/@user" class="u-url mention">@user</a> d</p>'), 'a @user@example.com d');
	});

	it('hashtag', () => {
		assert.deepStrictEqual(fromHtml('<p>a <a href="https://example.com/tags/a">#a</a> d</p>', ['#a']), 'a #a d');
	});

	it('bold', () => {
		assert.deepStrictEqual(fromHtml('<p>a<b>b</b>c</p>'), 'a**b**c');
	});

	it('small', () => {
		assert.deepStrictEqual(fromHtml('<p>a<small>b</small>c</p>'), 'a<small>b</small>c');
	});

	it('italic', () => {
		assert.deepStrictEqual(fromHtml('<p>a<i>b</i>c</p>'), 'a<i>b</i>c');
	});

	it('strike', () => {
		assert.deepStrictEqual(fromHtml('<p>a<del>b</del>c</p>'), 'a~~b~~c');
	});

	it('title', () => {
		assert.deepStrictEqual(fromHtml('<p>a<h1>b</h1>c</p>'), 'a【b】\nc');
	});

	it('ruby', () => {
		assert.deepStrictEqual(fromHtml('<p><ruby>魑魅魍魎<rp>(</rp><rt>ちみもうりょう</rt><rp>)</rp></ruby></p>'), '$[ruby 魑魅魍魎 ちみもうりょう]');
	});

	it('ruby - multi', () => {
		assert.deepStrictEqual(fromHtml('<p><ruby><rb>魑魅魍魎</rb>百鬼夜行<rp>(</rp><rt>ちみもうりょう</rt><rt>ひゃっきやこう</rt><rp>)</rp></ruby></p>'), '$[ruby 魑魅魍魎百鬼夜行 ちみもうりょうひゃっきやこう]');
	});
});

describe('toHtml', () => {
	it('br', () => {
		const input = 'foo\nbar\nbaz';
		const output = '<p><span>foo<br>bar<br>baz</span></p>';
		assert.equal(toHtml(parseFull(input)!), output);
	});

	it('br alt', () => {
		const input = 'foo\r\nbar\rbaz';
		const output = '<p><span>foo<br>bar<br>baz</span></p>';
		assert.equal(toHtml(parseFull(input)!), output);
	});

	it('blod', () => {
		assert.equal(toHtml(parseFull('a**b**c')!), `<p><span>a</span><b><span>b</span></b><span>c</span></p>`);
	});

	it('small', () => {
		assert.equal(toHtml(parseFull('a<small>b</small>c')!), `<p><span>a</span><small><span>b</span></small><span>c</span></p>`);
	});

	it('italic', () => {
		assert.equal(toHtml(parseFull('a<i>b</i>c')!), `<p><span>a</span><i><span>b</span></i><span>c</span></p>`);
	});

	/*
	it('sub', () => {
		assert.equal(toHtml(parseFull('a<sub>b</sub>c')!), `<p><span>a</span><sub><span>b</span></sub><span>c</span></p>`);
	});

	it('sup', () => {
		assert.equal(toHtml(parseFull('a<sup>b</sup>c')!), `<p><span>a</span><sup><span>b</span></sup><span>c</span></p>`);
	});
	*/

	it('strike', () => {
		assert.equal(toHtml(parseFull('a~~b~~c')!), `<p><span>a</span><del><span>b</span></del><span>c</span></p>`);
	});

	it('quote', () => {
		assert.equal(toHtml(parseFull('a\n> b\nc')!), `<p><span>a<br></span><blockquote><span>b</span></blockquote><span>c</span></p>`);
	});

	it('inlineCode', () => {
		assert.equal(toHtml(parseFull('a`b`c')!), `<p><span>a</span><code>b</code><span>c</span></p>`);
	});

	it('blockCode', () => {
		assert.equal(toHtml(parseFull('```\na\n```')!), `<p><pre><code>a</code></pre></p>`);
	});

	it('blockCode with lang', () => {
		assert.equal(toHtml(parseFull('```js\na\n```')!), `<p><pre><code data-lang="js">a</code></pre></p>`);
	});

	it('title', () => {
		assert.equal(toHtml(parseFull('【a】')!), `<p><h1><span>a</span></h1></p>`);
	});

	it('ruby', () => {
		assert.equal(toHtml(parseFull('$[ruby 魑魅魍魎 ちみもうりょう]')!), `<p><ruby>魑魅魍魎<rp>(</rp><rt>ちみもうりょう</rt><rp>)</rp></ruby></p>`);
	});


	/*
	it('fn', () => {
		assert.equal(toHtml(parseFull('$[spin.y,left,speed=1s,delay=0.3s a]')!), `<p><i data-mfm="spin" data-mfm-y="1" data-mfm-left="1" data-mfm-speed="1s" data-mfm-delay="0.3s"><span>a</span></i></p>`);
	});
	*/
});

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

	it('装飾の下', () => {
		const ast = parseBasic('@foo ** @bar ** @baz')!;
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

describe('Extract hashtags', () => {
	it('simple', () => {
		const ast = parseBasic('#あ #いいい #ううう')!;
		const mentions = extractHashtags(ast);
		assert.deepStrictEqual(mentions, ['あ', 'いいい', 'ううう']);
	});

	it('duplicate', () => {
		const ast = parseBasic('#あ #いいい #あ')!;
		const mentions = extractHashtags(ast);
		assert.deepStrictEqual(mentions, ['あ', 'いいい']);
	});
});

describe('Extract emojis', () => {
	it('simple', () => {
		const ast = parseBasic(':aaa: :bbb:')!;
		const emojis = extractEmojis(ast);
		assert.deepStrictEqual(emojis, ['aaa', 'bbb']);
	});

	it('装飾内', () => {
		const ast = parseBasic(':aaa: ***:bbb:***')!;
		const emojis = extractEmojis(ast);
		assert.deepStrictEqual(emojis, ['aaa', 'bbb']);
	});

	it('リンク内', () => {
		const ast = parseBasic(':aaa: [a :bbb: c](https://example.com)')!;
		const emojis = extractEmojis(ast);
		assert.deepStrictEqual(emojis, ['aaa', 'bbb']);
	});

	it('duplicate', () => {
		const ast = parseBasic(':aaa: :bbb: :aaa:')!;
		const emojis = extractEmojis(ast);
		assert.deepStrictEqual(emojis, ['aaa', 'bbb']);
	});
});
