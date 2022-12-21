import { ParsedUrlQuery } from 'querystring';
import { getJSONFeed } from './json';
import { objectToXml } from './util';

export interface IRSS {
	rss: {
		'@version': '2.0';
		'@xmlns:atom'?: 'http://www.w3.org/2005/Atom';
		'@xmlns:dc'?: 'http://purl.org/dc/elements/1.1/';
		'@xmlns:content'?: 'http://purl.org/rss/1.0/modules/content/';
		channel: {
			title: string;
			link: string;
			description: string;
			pubDate?: string;	// in RFC 822
			generator?: string;
			image?: {
				url: string;
				link: string;
				title: string;
			};
			item?: IRSSItem[];
		};
	};
}

export interface IRSSItem {
	title: string;
	link: string;
	description?: string;
	'atom:link'?: {
		'@href': string,
		'@rel': 'self',
		'@type': 'application/rss+xml'
	};
	'dc:creator'?: string;
	'content:encoded'?: {
		'#cdata': string;
	};
	category?: string[];
	guid?: {
		'#text': string;
		'@isPermaLink'?: boolean;
	};
	pubDate?: string;	// in RFC 822
	enclosure?: {
		'@url': string;
		'@type': string;
		'@length': number;
	}[];
}

/**
 * Generate RSS Feed XML
 * @param acct @username@host
 * @param untilId UntileId
 */
export async function getRSSFeed(acct: string, q: ParsedUrlQuery) {
	const json = await getJSONFeed(acct, q);
	if (!json) return null;

	const root = {
		rss: {
			'@version': '2.0',
			'@xmlns:atom': 'http://www.w3.org/2005/Atom',
			'@xmlns:dc': 'http://purl.org/dc/elements/1.1/',
			'@xmlns:content': 'http://purl.org/rss/1.0/modules/content/',
			channel: {
				'atom:link': {
					'@href': json.feed_url?.replace(/\.json$/, '.atom'),
					'@rel': 'self',
					'@type': 'application/rss+xml'
				},
				title: json.title,
				link: json.home_page_url,
				description: json.description,
				pubDate: new Date().toUTCString(),
				generator: 'Misskey',
				image: {
					url: json.icon,
					link: json.home_page_url,
					title: json.title
				},
			}
		}
	} as IRSS;

	if (json.items) {
		root.rss.channel.item = [];

		for (const item of json.items) {
			const entry = {
				title: item.title,
				link: item.url,
				'dc:creator': item.author ? item.author.name : json.author ? json.author.name : undefined,
				description: item.content_text,
				'content:encoded': {
					'#cdata': item.content_html
				},
				category: item.tags,
				guid: {
					'#text': item.id,
				},
				pubDate: item.date_published ? new Date(item.date_published).toUTCString() : undefined,
			} as IRSSItem;

			if (item.attachments) {
				entry.enclosure = item.attachments.map(attach => {
					return {
						'@url': attach.url,
						'@type': attach.mime_type,
						'@length': attach.size_in_bytes ? attach.size_in_bytes : 0,
					};
				});
			}

			root.rss.channel.item.push(entry);
		}
	}

	return objectToXml(root);
}
