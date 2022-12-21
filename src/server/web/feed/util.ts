import { ParsedUrlQuery } from 'querystring';
import xmlbuilder = require('xmlbuilder');
import $ from 'cafy';

/**
 * Convert to XML
 * @param obj source object
 */
export function objectToXml(obj: any): string {
	const xml = xmlbuilder.create(obj, { encoding: 'utf-8' });
	return xml.end({ pretty: true });
}

export function parseQuery(q: ParsedUrlQuery) {
	const untilId = $.optional.str.throw(tryJsonParse(q.until_id));
	const res = {
		untilId
	};
	return res;
}

function tryJsonParse(v: string | string[] | undefined): unknown {
	if (typeof v !== 'string') return undefined;
	try {
		return JSON.parse(v);
	} catch {
		return v;
	}
}
