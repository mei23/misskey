export function checkAllowedUrl(url: string | URL | undefined): boolean {
	if (process.env.NODE_ENV !== 'production') return true;

	try {
		if (url == null) return false;

		const u = typeof url === 'string' ? new URL(url) : url;
		if (!u.protocol.match(/^https?:$/) || u.hostname === 'unix') {
			return false;
		}

		if (u.port !== '' && !['80', '443'].includes(u.port)) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}
