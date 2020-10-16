import * as Router from '@koa/router';
import * as tmp from 'tmp';
import * as fs from 'fs';
import { serverLogger } from '..';
import Emoji from '../../models/emoji';
import { detectType, calcHash } from '../../misc/get-file-info';
import { downloadUrl } from '../../misc/download-url';

export default async function(ctx: Router.RouterContext) {
	const emoji = await Emoji.findOne({
		name: ctx.params.name,
		host: ctx.params.host,
	});

	if (emoji == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'max-age=86400');
		return;
	}

	// Create temp file
	const [path, cleanup] = await new Promise<[string, any]>((res, rej) => {
		tmp.file((e, path, fd, cleanup) => {
			if (e) return rej(e);
			res([path, cleanup]);
		});
	});

	try {
		await downloadUrl(emoji.url, path);

		const { mime } = await detectType(path);

		const md5 = await calcHash(path);

		if (emoji.md5 !== md5) {
			console.log(`Update emoji md5 ${emoji.md5} => ${md5}`);
			Emoji.update({ _id: emoji._id }, {
				$set: {
					md5
				}
			});
		}

		ctx.body = fs.readFileSync(path);
		ctx.set('Content-Type', mime);
		ctx.set('Cache-Control', 'max-age=31536000, immutable');
	} catch (e) {
		serverLogger.error(e);

		// ハッシュをリセットしてもう採用しないようにする
		const defered = () => {
			console.log(`Update emoji md5 ${emoji.md5} => null`);
			Emoji.update({ _id: emoji._id }, {
				$set: {
					md5: null
				}
			});
		};

		if (typeof e == 'number' && e >= 400 && e < 500) {
			// 4xx
			defered();
			ctx.status = e;
			ctx.set('Cache-Control', 'max-age=86400');
		} else if (typeof e == 'number') {
			// other status code
			ctx.status = 500;
			ctx.set('Cache-Control', 'max-age=300');
		} else {
			// 繋がらない
			defered();
			ctx.status = 500;
			ctx.set('Cache-Control', 'max-age=300');
		}
	} finally {
		cleanup();
	}
}
