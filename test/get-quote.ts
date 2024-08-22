import * as assert from 'assert';
import { getQuote } from '../src/misc/get-quote';

describe('getQuote', () => {
	it('_misskey_quote', () => {
		assert.deepStrictEqual(getQuote({
			_misskey_quote: 'https://example.com/notes/quote',
		} as any), {
			href: 'https://example.com/notes/quote',
		});
	});

	it('quoteUri', () => {
		assert.deepStrictEqual(getQuote({
			quoteUri: 'https://example.com/notes/quote',
		} as any), {
			href: 'https://example.com/notes/quote',
		});
	});

	it('FEP-e232', () => {
		assert.deepStrictEqual(getQuote({
			tag: [
				{
					type: 'Link',
					mediaType: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
					rel: 'https://misskey-hub.net/ns#_misskey_quote',
					href: 'https://example.com/notes/quote',
					name: 'RE: https://example.com/html/quote',
				}
			],
		} as any), {
			href: 'https://example.com/notes/quote',
			name: 'RE: https://example.com/html/quote',
		});
	});

	it('FEP-e232 application/activity+json', () => {
		assert.deepStrictEqual(getQuote({
			tag: [
				{
					type: 'Link',
					mediaType: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
					rel: 'https://misskey-hub.net/ns#_misskey_quote',
					href: 'https://example.com/notes/quote',
					name: 'RE: https://example.com/html/quote',
				}
			],
		} as any), {
			href: 'https://example.com/notes/quote',
			name: 'RE: https://example.com/html/quote',
		});
	});

	it('FEP-e232 invalid mediaType', () => {
		assert.deepStrictEqual(getQuote({
			tag: [
				{
					type: 'Link',
					mediaType: 'text/html',
					rel: 'https://misskey-hub.net/ns#_misskey_quote',
					href: 'https://example.com/notes/quote',
					name: 'RE: https://example.com/html/quote',
				}
			],
		} as any), null);
	});

	it('FEP-e232 no Link', () => {
		assert.deepStrictEqual(getQuote({
			tag: [
				{
					type: 'Link2',
					mediaType: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
					rel: 'https://misskey-hub.net/ns#_misskey_quote',
					href: 'https://example.com/notes/quote',
					name: 'RE: https://example.com/html/quote',
				}
			],
		} as any), null);
	});

	it('FEP-e232 no match rel', () => {
		assert.deepStrictEqual(getQuote({
			tag: [
				{
					type: 'Link',
					mediaType: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
					href: 'https://example.com/notes/quote',
					name: 'RE: https://example.com/html/quote',
				}
			],
		} as any), null);
	});
});
