const escapeRegExp = require('escape-regexp');

export default function(title: string | null, siteName?: string | null): string | null {
	if (title == null) return title;
	title = title.trim();

	if (siteName) {
		siteName = siteName.trim();

		const x = escapeRegExp(siteName);

		const patterns = [
			`^(.+?)\\s?[\\-\\|:・]\\s?${x}$`
		];

		// tslint:disable-next-line:prefer-for-of
		for (let i = 0; i < patterns.length; i++) {
			const pattern = new RegExp(patterns[i]);
			const [, match] = pattern.exec(title) || [null, null];
			if (match) {
				return match;
			}
		}
	}

	return title;
}
