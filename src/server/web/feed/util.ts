import xmlbuilder = require('xmlbuilder');

/**
 * Convert to XML
 * @param obj source object
 */
export function objectToXml(obj: any): string {
	const xml = xmlbuilder.create(obj, { encoding: 'utf-8' });
	return xml.end({ pretty: true });
}
