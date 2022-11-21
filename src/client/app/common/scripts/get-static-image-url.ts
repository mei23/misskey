import { url as instanceUrl } from '../../config';
import * as url from '../../../../prelude/url';

export function getStaticImageUrl(baseUrl: string, type?: string, animation?: string): string {
	// アニメーションまたはその可能性があるか
	const anim = type == null || type === 'image/gif' || type === 'image/apng' || ((type === 'image/png' || type === 'image/webp'|| type === 'image/avif') && animation !== 'no');

	if (!anim) return baseUrl;
	const u = new URL(baseUrl);
	const dummy = `${u.pathname.replace(/.*\//, '')}`;	// 拡張子がないとキャッシュしてくれないCDNがあるので
	return `${instanceUrl}/proxy/${dummy}?${url.query({
		url: u.href,
		static: '1'
	})}`;
}
