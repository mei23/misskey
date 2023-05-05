export function checkAllowedUrl(url: string | URL | undefined): boolean {
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
