import { createTemp } from './create-temp';
import { downloadUrl } from './download-url';
import { detectTypeWithCheck, calcHash } from './get-file-info';

export async function detectUrlMime(url: string) {
	const [path, cleanup] = await createTemp();

	try {
		await downloadUrl(url, path);
		const { mime } = await detectTypeWithCheck(path);
		const md5 = await calcHash(path);
		return { mime, md5 };
	} finally {
		cleanup();
	}
}
