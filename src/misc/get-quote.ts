import { removeNull, toArray } from '../prelude/array';
import { IObject, IPost, isLink } from '../remote/activitypub/type';

/**
 * rels treated as quote
 */
const relQuotes = new Set<string>([
	'https://misskey-hub.net/ns#_misskey_quote',
	'http://fedibird.com/ns#quoteUri',
]);

/**
 * Misskey like quote
 */
type Quote = {
	/** Target AP object ID */
	href: string;
	/** Fallback text */
	name?: string;
};

/**
 * Get one Misskey like quote
 */
export function getQuote(post: IPost): Quote | null {
	// Misskey
	if (typeof post._misskey_quote === 'string') return { href: post._misskey_quote }
	// Fedibird
	if (typeof post.quoteUri === 'string') return { href: post.quoteUri }

	// FEP-e232: Object Links
	// https://codeberg.org/fediverse/fep/src/branch/main/fep/e232/fep-e232.md
	const fepe232Tags = parseFepE232Tags(toArray(post.tag));
	const fepe232Quote = fepe232Tags.filter(x => x.rel && relQuotes.has(x.rel))[0];
	if (fepe232Quote) {
		return {
			href: fepe232Quote.href,
			name: fepe232Quote.name,
		};
	}

	return null;
}

/**
 * Get AP links (experimental)
 */
export function getApLinks(post: IPost) {
	const fepe232Tags = parseFepE232Tags(toArray(post.tag));
	
	// other attachements?

	return fepe232Tags;
}

//#region FEP-e232
type FepE232Tag = {
	type: 'Link';
	mediaType: string;
	href: string;
	name?: string;
	rel?: string;
};

function parseFepE232Tags(tags: IObject[]): FepE232Tag[] {
	return removeNull(tags.map(x => parseFepE232Tag(x)));
}

function parseFepE232Tag(tag: IObject): FepE232Tag | null {
	if (!isLink(tag)) return null;
	if (!validateContentType(tag.mediaType)) return null;
	if (typeof tag.href !== 'string') return null;

	return {
		type: tag.type,
		mediaType: tag.mediaType,
		href: tag.href,
		name: typeof tag.name === 'string' ? tag.name : undefined,
		rel: typeof tag.rel === 'string' ? tag.rel : undefined,
	};
}

function validateContentType(contentType: unknown): contentType is string {
	if (contentType == null) return false;
	if (typeof contentType !== 'string') return false;

	const parts = contentType.split(/\s*;\s*/);
	if (parts[0] === 'application/activity+json') return true;
	if (parts[0] !== 'application/ld+json') return false;
	return parts.slice(1).some(part => part.trim() === 'profile="https://www.w3.org/ns/activitystreams"');
}
//#endregion
