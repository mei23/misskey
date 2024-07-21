import { getJson } from '../misc/fetch';
import { URL } from 'url';
import { query as urlQuery } from '../prelude/url';
import { Acct } from './resolve-user';

type ILink = {
	href: string;
	rel?: string;
	type?: string;
	template?: string;
};

type IWebFinger = {
	links: ILink[];
	subject: string;
};

export default async function(query: string | Acct): Promise<IWebFinger> {
	const url = genUrl(query);
	console.log('WFGET', url);

	return await getJson(url, 'application/jrd+json, application/json');
}

function genUrl(query: string | Acct) {
	if (query instanceof Acct) {
		return `https://${query.host}/.well-known/webfinger?` + urlQuery({ resource: query.toString() });
	}

	if (query.match(/^https?:\/\//)) {
		const u = new URL(query);
		return `${u.protocol}//${u.hostname}/.well-known/webfinger?` + urlQuery({ resource: query });
	}

	throw new Error(`Invalid query (${query})`);
}
