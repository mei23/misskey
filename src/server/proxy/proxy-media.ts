import * as fs from 'fs';
import * as Router from '@koa/router';
import { serverLogger } from '..';
import { IImage, convertToPng, convertToJpeg } from '../../services/drive/image-processor';
import { createTemp } from '../../misc/create-temp';
import { downloadUrl } from '../../misc/download-url';
import { detectTypeWithCheck, FILE_TYPE_BROWSERSAFE } from '../../misc/get-file-info';
import { StatusError } from '../../misc/fetch';

export async function proxyMedia(ctx: Router.RouterContext) {
	const url = 'url' in ctx.query ? ctx.query.url : 'https://' + ctx.params.url;

	// Create temp file
	const [path, cleanup] = await createTemp();

	try {
		await downloadUrl(url, path);

		const { mime, ext } = await detectTypeWithCheck(path);

		let image: IImage;

		if ('static' in ctx.query && ['image/png', 'image/apng', 'image/gif', 'image/webp', 'image/svg+xml'].includes(mime)) {
			image = await convertToPng(path, 530, 255);
		} else if ('preview' in ctx.query && ['image/jpeg', 'image/png', 'image/apng', 'image/gif', 'image/webp', 'image/svg+xml'].includes(mime)) {
			image = await convertToJpeg(path, 200, 200);
		}	else if (['image/svg+xml'].includes(mime)) {
			image = await convertToPng(path, 2048, 2048);
		} else if (!mime.startsWith('image/') || !FILE_TYPE_BROWSERSAFE.includes(mime)) {
			throw new StatusError('Rejected type', 403, 'Rejected type');
		} else {
			image = {
				data: await fs.promises.readFile(path),
				ext: ext || '',
				type: mime,
			};
		}

		ctx.body = image.data;
		ctx.set('Content-Type', image.type);
		ctx.set('Cache-Control', 'max-age=604800, immutable');
	} catch (e) {
		serverLogger.error(e);

		if (e instanceof StatusError && e.isClientError) {
			ctx.status = e.statusCode;
			ctx.set('Cache-Control', 'max-age=86400');
		} else {
			ctx.status = 500;
			ctx.set('Cache-Control', 'max-age=300');
		}
	} finally {
		cleanup();
	}
}
