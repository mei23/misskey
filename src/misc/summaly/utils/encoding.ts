import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';

const regCharset = new RegExp(/charset\s*=\s*["']?([\w-]+)/, 'i');

/**
 * Detect HTML encoding
 * @param body Body in Buffer
 * @returns encoding
 */
export function detectEncoding(body: Buffer): string {
	// By detection
	const detected = jschardet.detect(body, { minimumThreshold: 0.99 });
	if (detected) {
		const candicate = detected.encoding;
		const encoding = toEncoding(candicate);
		if (encoding != null) return encoding;
	}

	// From meta
	const matchMeta = body.toString('ascii').match(regCharset);
	if (matchMeta) {
		const candicate = matchMeta[1];
		const encoding = toEncoding(candicate);
		if (encoding != null) return encoding;
	}

	return 'utf-8';
}

export function toUtf8(body: Buffer, encoding: string): string {
	return iconv.decode(body, encoding);
}

function toEncoding(candicate: string): string | null {
	if (iconv.encodingExists(candicate)) {
		if (['shift_jis', 'shift-jis', 'windows-31j', 'x-sjis'].includes(candicate.toLowerCase())) return 'cp932';
		return candicate;
	} else {
		return null;
	}
}
