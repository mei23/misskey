const PrivateIp = require('private-ip');

export function checkAllowedUrl(url: string | URL | undefined): boolean {
	if (process.env.NODE_ENV !== 'production') return true;

	try {
		if (url == null) return false;

		const u = typeof url === 'string' ? new URL(url) : url;

		// procotol
		if (!u.protocol.match(/^https?:$/)) {
			return false;
		}

		// non dot host
		if (!u.hostname.includes('.')) {
			return false;
		}

		// port
		if (u.port !== '' && !['80', '443'].includes(u.port)) {
			return false;
		}

		// private address
		if (PrivateIp(u.hostname)) {
			return false;
		}

		// has auth
		if (u.username || u.password) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}
