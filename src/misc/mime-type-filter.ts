import escapeRegExp = require('escape-regexp');

export const typeFilterValidater = /^([*]|[a-z]+)[/]([*]|[0-9A-Za-z+.-]+)$/;

export function genTypeFilterRegex(pattern: string) {
	const m = pattern.match(typeFilterValidater);
	if (!m) throw 'Invalid pattern';
	const cnv = (x: string) => x === '*' ? '[^/]+' : escapeRegExp(x);
	return new RegExp(`^${cnv(m[1])}[/]${cnv(m[2])}$`);
}
