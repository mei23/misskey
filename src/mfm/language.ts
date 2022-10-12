import * as P from 'parsimmon';
import { createMfmNode, urlRegex } from './utils';
import { Predicate } from '../prelude/relation';
import parseAcct from '../misc/acct/parse';
import { toUnicode } from 'punycode/';
import { emojiRegex, vendorEmojiRegex } from '../misc/emoji-regex';
import * as tinycolor from 'tinycolor2';

export function removeOrphanedBrackets(s: string): string {
	const openBrackets = ['(', '['];
	const closeBrackets = [')', ']'];
	const xs = cumulativeSum(s.split('').map(c => {
		if (openBrackets.includes(c)) return 1;
		if (closeBrackets.includes(c)) return -1;
		return 0;
	}));
	const firstOrphanedCloseBracket = xs.findIndex(x => x < 0);
	if (firstOrphanedCloseBracket !== -1) return s.substr(0, firstOrphanedCloseBracket);
	const lastMatched = xs.lastIndexOf(0);
	return s.substr(0, lastMatched + 1);
}

export const mfmLanguage = P.createLanguage({
	root: r => P.alt(r.block, r.inline).atLeast(1),
	plain: r => P.alt(r.emoji, r.text).atLeast(1),
	plainX: r => P.alt(r.inline).atLeast(1),
	basic: r => P.alt(
		r.blockCode,
		r.inlineCode,
		r.mention,
		r.hashtag,
		r.url,
		r.link,
		r.rj,
		r.emoji,
		r.text,
	).atLeast(1),
	block: r => P.alt(
		r.title,
		r.quote,
		r.search,
		r.blockCode,
		r.mathBlock,
		r.center,
		r.marquee,
		r.color,
	),
	inline: r => P.alt(
		r.bigger,
		r.big,
		r.bold,
		r.small,
		r.italic,
		r.strike,
		r.motion,
		r.spin,
		r.xspin,
		r.yspin,
		r.jump,
		r.flip,
		r.vflip,
		r.rotate,
		r.inlineCode,
		r.mathInline,
		r.mention,
		r.hashtag,
		r.url,
		r.link,
		r.rj,
		r.emoji,

		// 装飾はここに追加
		r.blink,
		r.twitch,
		r.shake,
		r.sup,
		r.sub,
		r.rgbshift,
		r.x1,
		r.x2,
		r.x3,
		r.x4,

		r.fn,

		r.text
	),
	startOfLine: () => P((input, i) => {
		if (i == 0 || input[i] == '\n' || input[i - 1] == '\n') {
			return P.makeSuccess(i, null);
		} else {
			return P.makeFailure(i, 'not newline');
		}
	}),
	title: r => r.startOfLine.then(P((input, i) => {
		const text = input.substr(i);
		const match = text.match(/^([【]([^【】\n]+?)[】])(\n|$)/);
		if (!match) return P.makeFailure(i, 'not a title');
		const q = match[2].trim();
		const contents = r.inline.atLeast(1).tryParse(q);
		return P.makeSuccess(i + match[0].length, createMfmNode('title', {}, contents));
	})),
	quote: r => r.startOfLine.then(P((input, i) => {
		const text = input.substr(i);
		if (!text.match(/^>[\s\S]+?/)) return P.makeFailure(i, 'not a quote');
		const quote = takeWhile(line => line.startsWith('>'), text.split('\n'));
		const qInner = quote.join('\n').replace(/^>/gm, '').replace(/^ /gm, '');
		if (qInner == '') return P.makeFailure(i, 'not a quote');
		const contents = r.root.tryParse(qInner);
		return P.makeSuccess(i + quote.join('\n').length + 1, createMfmNode('quote', {}, contents));
	})),
	search: r => r.startOfLine.then(P((input, i) => {
		const text = input.substr(i);
		const match = text.match(/^(.+?)( |　)(検索|\[検索\]|Search|\[Search\])(\n|$)/i);
		if (!match) return P.makeFailure(i, 'not a search');
		return P.makeSuccess(i + match[0].length, createMfmNode('search', { query: match[1], content: match[0].trim() }));
	})),
	blockCode: r => r.startOfLine.then(P((input, i) => {
		const text = input.substr(i);
		const match = text.match(/^```(.+?)?\n([\s\S]+?)\n```(\n|$)/i);
		if (!match) return P.makeFailure(i, 'not a blockCode');
		return P.makeSuccess(i + match[0].length, createMfmNode('blockCode', { code: match[2], lang: match[1] ? match[1].trim() : null }));
	})),
	marquee: r => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^<marquee(\s[a-z-]+?)?>(.+?)<\/marquee>/i);
			if (!match) return P.makeFailure(i, 'not a marquee');
			return P.makeSuccess(i + match[0].length, {
				content: match[2], attr: match[1] ? match[1].trim() : null
			});
		}).map(x => createMfmNode('marquee', { attr: x.attr }, r.inline.atLeast(1).tryParse(x.content)));
	},
	color: r => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^<color\s+(\S+)(?:\s+(\S+))?>([\s\S]+?)<[/]color>/i);
			if (!match) return P.makeFailure(i, 'not a color');

			const fg = tinycolor(match[1]);
			if (!fg.isValid()) return P.makeFailure(i, 'not a valid fg color');

			const bg = tinycolor(match[2]);

			return P.makeSuccess(i + match[0].length, {
				content: match[3], fg: fg.toHex8String(), bg: bg.isValid() ? bg.toHex8String() : undefined
			});
		}).map(x => createMfmNode('color', { fg: x.fg, bg: x.bg }, r.inline.atLeast(1).tryParse(x.content)));
	},

	big: r => P.regexp(/^\*\*\*([\s\S]+?)\*\*\*/, 1).map(x => createMfmNode('big', {}, r.inline.atLeast(1).tryParse(x))),
	bigger: r => P.regexp(/^\*\*\*\*([\s\S]+?)\*\*\*\*/, 1).map(x => createMfmNode('bigger', {}, r.inline.atLeast(1).tryParse(x))),
	bold: r => {
		const asterisk = P.regexp(/\*\*([\s\S]+?)\*\*/, 1);
		const underscore = P.regexp(/__([a-zA-Z0-9\s]+?)__/, 1);
		return P.alt(asterisk, underscore).map(x => createMfmNode('bold', {}, r.inline.atLeast(1).tryParse(x)));
	},
	small: r => P.regexp(/<small>([\s\S]+?)<\/small>/, 1).map(x => createMfmNode('small', {}, r.inline.atLeast(1).tryParse(x))),
	italic: r => {
		const xml = P.regexp(/<i>([\s\S]+?)<\/i>/, 1);
		const underscore = P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^(\*|_)([a-zA-Z0-9]+?[\s\S]*?)\1/);
			if (!match) return P.makeFailure(i, 'not a italic');
			if (input[i - 1] != null && input[i - 1] != ' ' && input[i - 1] != '\n') return P.makeFailure(i, 'not a italic');
			return P.makeSuccess(i + match[0].length, match[2]);
		});

		return P.alt(xml, underscore).map(x => createMfmNode('italic', {}, r.inline.atLeast(1).tryParse(x)));
	},
	strike: r => P.regexp(/~~([^\n~]+?)~~/, 1).map(x => createMfmNode('strike', {}, r.inline.atLeast(1).tryParse(x))),
	motion: r => {
		const paren = P.regexp(/\(\(\(([\s\S]+?)\)\)\)/, 1);
		const xml = P.regexp(/<motion>(.+?)<\/motion>/, 1);
		return P.alt(paren, xml).map(x => createMfmNode('motion', {}, r.inline.atLeast(1).tryParse(x)));
	},
	spin: r => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^<spin(\s[a-z]+?)?>(.+?)<\/spin>/i);
			const matchC = text.match(/^\[\[\[([\s\S]+?)\]\]\]/i);

			if (match) {
				return P.makeSuccess(i + match[0].length, {
					content: match[2], attr: match[1] ? match[1].trim() : null
				});
			} else if (matchC) {
				return P.makeSuccess(i + matchC[0].length, {
					content: matchC[1], attr: null
				});
			} else {
				return P.makeFailure(i, 'not a spin');
			}
		}).map(x => createMfmNode('spin', { attr: x.attr }, r.inline.atLeast(1).tryParse(x.content)));
	},
	xspin: r => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^<xspin(\s[a-z]+?)?>(.+?)<\/xspin>/i);

			if (match) {
				return P.makeSuccess(i + match[0].length, {
					content: match[2], attr: match[1] ? match[1].trim() : null
				});
			} else {
				return P.makeFailure(i, 'not a spin');
			}
		}).map(x => createMfmNode('xspin', { attr: x.attr }, r.inline.atLeast(1).tryParse(x.content)));
	},
	yspin: r => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^<yspin(\s[a-z]+?)?>(.+?)<\/yspin>/i);

			if (match) {
				return P.makeSuccess(i + match[0].length, {
					content: match[2], attr: match[1] ? match[1].trim() : null
				});
			} else {
				return P.makeFailure(i, 'not a spin');
			}
		}).map(x => createMfmNode('yspin', { attr: x.attr }, r.inline.atLeast(1).tryParse(x.content)));
	},
	jump: r => P.alt(P.regexp(/<jump>(.+?)<\/jump>/, 1), P.regexp(/\{\{\{([\s\S]+?)\}\}\}/, 1)).map(x => createMfmNode('jump', {}, r.inline.atLeast(1).tryParse(x))),
	flip: r => {
		const a = P.regexp(/<flip>(.+?)<\/flip>/, 1);
		const b = P.regexp(/＜＜＜(.+?)＞＞＞/, 1);
		return P.alt(a, b).map(x => createMfmNode('flip', {}, r.inline.atLeast(1).tryParse(x)));
	},
	vflip: r => P.regexp(/<vflip>(.+?)<\/vflip>/, 1).map(x => createMfmNode('vflip', {}, r.inline.atLeast(1).tryParse(x))),
	rotate: r => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^<rotate\s+([+-]?\d+)>(.+?)<\/rotate>/i);

			if (match) {
				return P.makeSuccess(i + match[0].length, {
					content: match[2], attr: match[1]
				});
			} else {
				return P.makeFailure(i, 'not a rotate');
			}
		}).map(x => createMfmNode('rotate', { attr: x.attr }, r.inline.atLeast(1).tryParse(x.content)));
	},

	// 装飾はここに追加
	blink: r => P.regexp(/<blink>(.+?)<\/blink>/, 1).map(x => createMfmNode('blink', {}, r.inline.atLeast(1).tryParse(x))),
	twitch: r => P.regexp(/<twitch>(.+?)<\/twitch>/, 1).map(x => createMfmNode('twitch', {}, r.inline.atLeast(1).tryParse(x))),
	shake: r => P.regexp(/<shake>(.+?)<\/shake>/, 1).map(x => createMfmNode('shake', {}, r.inline.atLeast(1).tryParse(x))),
	sup: r => P.regexp(/<sup>(.+?)<\/sup>/, 1).map(x => createMfmNode('sup', {}, r.inline.atLeast(1).tryParse(x))),
	sub: r => P.regexp(/<sub>(.+?)<\/sub>/, 1).map(x => createMfmNode('sub', {}, r.inline.atLeast(1).tryParse(x))),
	rgbshift: r => P.regexp(/<rgbshift>(.+?)<\/rgbshift>/, 1).map(x => createMfmNode('rgbshift', {}, r.inline.atLeast(1).tryParse(x))),
	x1: r => P.regexp(/<x1>(.+?)<\/x1>/, 1).map(x => createMfmNode('x1', {}, r.inline.atLeast(1).tryParse(x))),
	x2: r => P.regexp(/<x2>(.+?)<\/x2>/, 1).map(x => createMfmNode('x2', {}, r.inline.atLeast(1).tryParse(x))),
	x3: r => P.regexp(/<x3>(.+?)<\/x3>/, 1).map(x => createMfmNode('x3', {}, r.inline.atLeast(1).tryParse(x))),
	x4: r => P.regexp(/<x4>(.+?)<\/x4>/, 1).map(x => createMfmNode('x4', {}, r.inline.atLeast(1).tryParse(x))),

	center: r => r.startOfLine.then(P.regexp(/<center>([\s\S]+?)<\/center>/, 1).map(x => createMfmNode('center', {}, r.inline.atLeast(1).tryParse(x)))),
	inlineCode: () => P.regexp(/`([^´\n]+?)`/, 1).map(x => createMfmNode('inlineCode', { code: x })),
	mathBlock: r => r.startOfLine.then(P.regexp(/\\\[([\s\S]+?)\\\]/, 1).map(x => createMfmNode('mathBlock', { formula: x.trim() }))),
	mathInline: () => P.regexp(/\\\((.+?)\\\)/, 1).map(x => createMfmNode('mathInline', { formula: x })),
	mention: () => {
		return P((input, i) => {
			const text = input.substr(i);
			// eslint-disable-next-line no-useless-escape
			const match = text.match(/^@\w([\w-]*\w)?(?:@[\w\.\-]+\w)?/);
			if (!match) return P.makeFailure(i, 'not a mention');
			// @ の前に何かあればハッシュタグ扱いしない
			if (input[i - 1]?.match(/[^\s\u200b]/)) return P.makeFailure(i, 'not a mention');
			return P.makeSuccess(i + match[0].length, match[0]);
		}).map(x => {
			const { username, host } = parseAcct(x.substr(1));
			const canonical = host != null ? `@${username}@${toUnicode(host)}` : x;
			return createMfmNode('mention', { canonical, username, host, acct: x });
		});
	},
	hashtag: () => P((input, i) => {
		// ローカルサーバーでの新規投稿作成時 / クライアントでのパース時 共通で適用したいハッシュタグ条件はここで指定する
		// ローカルサーバーでの新規投稿作成時 に最終的にどれをハッシュタグとするかはisHashtag()に記述
		// クライアントでのパース時 に最終的にどれをハッシュタグとするかはタグとして添付されているかで決まる

		const text = input.substr(i);
		// eslint-disable-next-line no-useless-escape
		const match = text.match(/^#([^\s\.,!\?'"#:\/()\[\]]+)/i);
		if (!match) return P.makeFailure(i, 'not a hashtag');
		const hashtag = match[1];

		// # + U+20E3 / # + U+FE0F + U+20E3 のような 合字/絵文字異体字セレクタ付きは ハッシュタグ扱いしない
		if (hashtag.match(/^(\u20e3|\ufe0f)/)) return P.makeFailure(i, 'not a hashtag');

		// # の前に何かあればハッシュタグ扱いしない
		if (input[i - 1]?.match(/[^\s\u200b]/)) return P.makeFailure(i, 'not a hashtag');

		return P.makeSuccess(i + ('#' + hashtag).length, createMfmNode('hashtag', { hashtag: hashtag }));
	}),
	url: () => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(urlRegex);
			let url: string;
			if (!match) {
				const match = text.match(/^<(https?:\/\/.*?)>/);
				if (!match)
					return P.makeFailure(i, 'not a url');
				url = match[1];
				i += 2;
			} else {
				url = match[0];
				url = removeOrphanedBrackets(url);
				url = url.replace(/[.,]*$/, '');
			}
			return P.makeSuccess(i + url.length, url);
		}).map(x => createMfmNode('url', { url: x }));
	},
	link: r => {
		return P.seqObj(
			['silent', P.string('?').fallback(null).map(x => x != null)] as any,
			// eslint-disable-next-line no-useless-escape
			P.string('['), ['text', P.regexp(/[^\n\[\]]+/)] as any, P.string(']'),
			P.string('('), ['url', r.url] as any, P.string(')'),
		).map((x: any) => {
			return createMfmNode('link',
			{
				silent: x.silent,
				url: x.url.props.url
			}, P.alt(r.emoji, r.text).atLeast(1).tryParse(x.text));
		});
	},
	rj: r => {
		return P.regexp(/(RJ\d{6})/, 1).map((x: any) => {
			return createMfmNode('link',
			{
				silent: false,
				url: `https://www.dlsite.com/home/announce/=/product_id/${x}.html`,
			}, [createMfmNode('text', { text: x })]);
		});
	},

	emoji: () => {
		const name = P.regexp(/:(@?[\w-]+(?:@[\w.-]+)?):/i, 1).map(x => createMfmNode('emoji', { name: x }));
		const vcode = P.regexp(vendorEmojiRegex).map(x => createMfmNode('emoji', { emoji: x, vendor: true }));
		const code = P.regexp(emojiRegex).map(x => createMfmNode('emoji', { emoji: x }));
		return P.alt(name, vcode, code);
	},
	fn: r => {
		return P((input, i) => {
			const text = input.substr(i);
			const match = text.match(/^\$\[([0-9a-z]+)(?:\.([0-9a-z.,=]+))?\s+([^\n\[\]]+)\]/);
			if (!match) return P.makeFailure(i, 'not a fn');

			const name = match[1];
			const argsPart = match[2];
			const content = match[3];

			if (!['tada', 'jelly', 'twitch', 'shake', 'spin', 'jump', 'bounce', 'flip', 'rgbshift', 'x1', 'x2', 'x3', 'x4', 'font', 'blur'].includes(name)) {
				return P.makeFailure(i, 'unknown fn name');
			}

			const args: Record<string, boolean | string> = {};
			for (const arg of argsPart?.split(',') || []) {
				const kv = arg.split('=');
				if (kv[0] == '__proto__') return P.makeFailure(i, 'prototype pollution');
				if (kv.length === 1) {
					args[kv[0]] = true;
				} else {
					args[kv[0]] = kv[1];
				}
			}

			return P.makeSuccess(i + match[0].length, { name, args, content });
		}).map(x => createMfmNode('fn', { name: x.name, args: x.args }, r.inline.atLeast(1).tryParse(x.content)));
	},
	text: () => P.any.map(x => createMfmNode('text', { text: x }))
});

/**
 * Returns the longest prefix of elements that satisfy the predicate
 */
function takeWhile<T>(f: Predicate<T>, xs: T[]): T[] {
	const ys = [];
	for (const x of xs) {
		if (f(x)) {
			ys.push(x);
		} else {
			break;
		}
	}
	return ys;
}

function cumulativeSum(xs: number[]): number[] {
	const ys = Array.from(xs); // deep copy
	for (let i = 1; i < ys.length; i++) ys[i] += ys[i - 1];
	return ys;
}
