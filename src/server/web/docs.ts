/**
 * Docs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as showdown from 'showdown';
import 'showdown-highlightjs-extension';
import ms = require('ms');
import * as Router from '@koa/router';
import * as send from 'koa-send';
import * as glob from 'glob';
import config from '../../config';
import { copyright } from '../../const.json';
import * as locales from '../../../locales';
import * as nestedProperty from 'nested-property';

function getLang(lang: string): string {
	if (['en-US', 'ja-JP'].includes(lang)) {
		return lang;
	} else {
		return 'en-US';
	}
}

async function genVars(lang: string): Promise<{ [key: string]: any }> {
	const vars = {} as { [key: string]: any };

	vars['lang'] = lang;

	const cwd = path.resolve(__dirname + '/../../') + '/';	// built/

	const docs = glob.sync(`docs/**/*.${lang}.md`, { cwd });
	vars['docs'] = {};
	for (const x of docs) {
		const [, name] = x.match(/docs\/(.+?)\.(.+?)\.md$/);
		if (vars['docs'][name] == null) {
			vars['docs'][name] = {
				name,
				title: {}
			};
		}
		vars['docs'][name]['title'][lang] = (await fs.promises.readFile(cwd + x, 'utf-8')).match(/^# (.+?)\r?\n/)[1];
	}

	vars['kebab'] = (string: string) => string.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/\s+/g, '-').toLowerCase();

	vars['config'] = config;

	vars['copyright'] = copyright;

	vars['i18n'] = (key: string) => nestedProperty.get(locales[lang], key);

	return vars;
}

const router = new Router();

router.get('/assets/*', async ctx => {
	await send(ctx, ctx.params[0], {
		root: `${__dirname}/../../docs/assets/`,
		maxage: ms('1 days')
	});
});

router.get('/*/*', async ctx => {
	const lang = getLang(ctx.params[0]);
	const doc = ctx.params[1];

	showdown.extension('urlExtension', () => ({
		type: 'output',
		regex: /%URL%/g,
		replace: config.url
	}));

	showdown.extension('wsUrlExtension', () => ({
		type: 'output',
		regex: /%WS_URL%/g,
		replace: config.wsUrl
	}));

	showdown.extension('apiUrlExtension', () => ({
		type: 'output',
		regex: /%API_URL%/g,
		replace: config.apiUrl
	}));

	const conv = new showdown.Converter({
		tables: true,
		extensions: ['urlExtension', 'apiUrlExtension', 'highlightjs']
	});
	const md = await fs.promises.readFile(`${__dirname}/../../docs/${doc}.${lang}.md`, 'utf8');

	await ctx.render('docs-article', Object.assign({
		id: doc,
		html: conv.makeHtml(md),
		title: md.match(/^# (.+?)\r?\n/)[1],
		version: config.version
	}, await genVars(lang)));

	ctx.set('Cache-Control', 'public, max-age=300');
});

export default router;
