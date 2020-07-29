import * as Router from '@koa/router';
import * as manifest from '../../client/assets/manifest.json';
import * as deepcopy from 'deepcopy';
import fetchMeta from '../../misc/fetch-meta';
import config from '../../config';

module.exports = async (ctx: Router.RouterContext) => {
	const json = deepcopy(manifest);

	const instance = await fetchMeta();

	json.short_name = instance.name || 'Misskey';
	json.name = instance.name || 'Misskey';

	for (const x of json.icons) {
		if (x.sizes === '192x192' && config.icons?.manifest192?.url) {
			x.src = config.icons.manifest192.url;
		}
		if (x.sizes === '512x512' && config.icons?.manifest512?.url) {
			x.src = config.icons.manifest512.url;
		}
	}

	ctx.set('Cache-Control', 'max-age=300');
	ctx.body = json;
};
