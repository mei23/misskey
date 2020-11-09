/**
 * Web Client Server
 */

import ms = require('ms');
import * as Koa from 'koa';
import * as Router from '@koa/router';
import * as send from 'koa-send';
import * as favicon from 'koa-favicon';
import * as views from 'koa-views';
import { ObjectID } from 'mongodb';

import docs from './docs';
import User, { ILocalUser } from '../../models/user';
import parseAcct from '../../misc/acct/parse';
import config from '../../config';
import Note, { pack as packNote } from '../../models/note';
import getNoteSummary from '../../misc/get-note-summary';
import fetchMeta from '../../misc/fetch-meta';
import Emoji from '../../models/emoji';
import { genOpenapiSpec } from '../api/openapi/gen-spec';
import { getAtomFeed } from './feed/atom';
import { getRSSFeed } from './feed/rss';
import { getJSONFeed } from './feed/json';
import { buildMeta } from '../../misc/build-meta';
import Page, { packPage } from '../../models/page';
import { fromHtml } from '../../mfm/from-html';
const htmlescape = require('htmlescape');

const env = process.env.NODE_ENV;

const client = `${__dirname}/../../client/`;

// Init app
const app = new Koa();

// Init renderer
app.use(views(__dirname + '/views', {
	extension: 'pug',
	options: {
		config
	}
}));

// Serve favicon
app.use(favicon(`${client}/assets/favicon.ico`));

// Common request handler
app.use(async (ctx, next) => {
	// IFrameの中に入れられないようにする
	ctx.set('X-Frame-Options', 'DENY');
	await next();
});

// Init router
const router = new Router();

//#region static assets

router.get('/assets/*', async ctx => {
	if (env !== 'production') {
		ctx.set('Cache-Control', 'no-store');
	}

	await send(ctx, ctx.path, {
		root: client,
		maxage: ms('7 days'),
	});
});

// Apple touch icon
router.get('/apple-touch-icon.png', async ctx => {
	await send(ctx, '/assets/apple-touch-icon.png', {
		root: client
	});
});

// ServiceWorker
router.get(/^\/sw\.(.+?)\.js$/, async ctx => {
	await send(ctx, `/assets/sw.${ctx.params[0]}.js`, {
		root: client
	});
});

// Manifest
router.get('/manifest.json', require('./manifest'));

router.get('/robots.txt', async ctx => {
	await send(ctx, '/assets/robots.txt', {
		root: client
	});
});

//#endregion

// Docs
router.use('/docs', docs.routes());
router.get('/api-doc', async ctx => {
	await send(ctx, '/assets/redoc.html', {
		root: client
	});
});

// URL preview endpoint
router.get('/url', require('./url-preview'));

router.get('/api.json', async ctx => {
	ctx.body = genOpenapiSpec();
});

// Atom
router.get('/@:user.atom', async ctx => {
	const feed = await getAtomFeed(ctx.params.user, ctx.query.until_id);

	if (feed) {
		ctx.set('Content-Type', 'application/atom+xml; charset=utf-8');
		ctx.body = feed;
	} else {
		ctx.status = 404;
	}
});

// RSS
router.get('/@:user.rss', async ctx => {
	const feed = await getRSSFeed(ctx.params.user, ctx.query.until_id);

	if (feed) {
		ctx.set('Content-Type', 'application/rss+xml; charset=utf-8');
		ctx.body = feed;
	} else {
		ctx.status = 404;
	}
});

// JSON
router.get('/@:user.json', async ctx => {
	const feed = await getJSONFeed(ctx.params.user, ctx.query.until_id);

	if (feed) {
		ctx.set('Content-Type', 'application/json; charset=utf-8');
		ctx.body = JSON.stringify(feed, null, 2);
	} else {
		ctx.status = 404;
	}
});

//#region for crawlers
// User
router.get(['/@:user', '/@:user/:sub'], async (ctx, next) => {
	const { username, host } = parseAcct(ctx.params.user);
	const user = await User.findOne({
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		usernameLower: username.toLowerCase(),
		host
	}) as ILocalUser;

	if (user != null) {
		const meta = await fetchMeta();
		const builded = await buildMeta(meta, false);

		const me = user.fields
			? user.fields
				.filter(filed => filed.value != null && filed.value.match(/^https?:/))
				.map(field => field.value)
			: [];

		await ctx.render('user', {
			initialMeta: htmlescape(builded),
			user,
			me,
			sub: ctx.params.sub,
			instanceName: meta.name,
			icon: config.icons?.favicon?.url,
			iconType: config.icons?.favicon?.type,
			appleTouchIcon: config.icons?.appleTouchIcon?.url,
		});
		ctx.set('Cache-Control', 'public, max-age=60');
	} else {
		// リモートユーザーなので
		// サスペンドユーザーのogは出さないがAPI経由でモデレータが閲覧できるように
		await next();
	}
});

router.get('/users/:user', async ctx => {
	if (!ObjectID.isValid(ctx.params.user)) {
		ctx.status = 404;
		return;
	}

	const userId = new ObjectID(ctx.params.user);

	const user = await User.findOne({
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		_id: userId,
		host: null
	});

	if (user === null) {
		ctx.status = 404;
		return;
	}

	ctx.redirect(`/@${user.username}${ user.host == null ? '' : '@' + user.host}`);
});

// Note
router.get('/notes/:note', async ctx => {
	if (ObjectID.isValid(ctx.params.note)) {
		const note = await Note.findOne({ _id: ctx.params.note });

		if (note) {
			const _note = await packNote(note);
			const meta = await fetchMeta();
			const builded = await buildMeta(meta, false);

			let imageUrl;
			// use attached
			if (_note.files) {
				imageUrl = _note.files
					.filter((file: any) => file.type.match(/^(image|video)/) && !file.isSensitive)
					.map((file: any) => file.thumbnailUrl)
					.shift();
			}
			// or avatar
			if (imageUrl == null || imageUrl === '') {
				imageUrl = _note.user.avatarUrl;
			}

			await ctx.render('note', {
				initialMeta: htmlescape(builded),
				note: _note,
				summary: getNoteSummary(_note),
				imageUrl,
				instanceName: meta.name,
				icon: config.icons?.favicon?.url,
				iconType: config.icons?.favicon?.type,
				appleTouchIcon: config.icons?.appleTouchIcon?.url,
			});

			if (['public', 'home'].includes(note.visibility)) {
				ctx.set('Cache-Control', 'public, max-age=180');
			} else {
				ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');
			}

			return;
		}
	}

	ctx.status = 404;
});
//#endregion

// Page
router.get('/@:user/pages/:page', async ctx => {
	const { username, host } = parseAcct(ctx.params.user);
	const user = await User.findOne({
		usernameLower: username.toLowerCase(),
		host
	});

	if (user == null) return;

	const page = await Page.findOne({
		name: ctx.params.page,
		userId: user._id
	});

	if (page) {
		const _page = await packPage(page, user._id);
		const meta = await fetchMeta();
		const builded = await buildMeta(meta, false);
		await ctx.render('page', {
			initialMeta: htmlescape(builded),
			page: _page,
			instanceName: meta.name || 'Misskey',
			icon: config.icons?.favicon?.url,
			iconType: config.icons?.favicon?.type,
			appleTouchIcon: config.icons?.appleTouchIcon?.url,
});

		if (['public'].includes(page.visibility)) {
			ctx.set('Cache-Control', 'public, max-age=180');
		} else {
			ctx.set('Cache-Control', 'private, max-age=0, must-revalidate');
		}

		return;
	}

	ctx.status = 404;
});

router.get('/info', async ctx => {
	const meta = await fetchMeta();
	let desc = meta.description;
	try {
		desc = fromHtml(desc || '') || undefined;
	} catch { }
	const emojis = await Emoji.find({ host: null }, {
		fields: {
			_id: false
		}
	});
	await ctx.render('info', {
		version: config.version,
		emojis: emojis,
		meta: meta,
		desc,
	});
});

const override = (source: string, target: string, depth: number = 0) =>
	[, ...target.split('/').filter(x => x), ...source.split('/').filter(x => x).splice(depth)].join('/');

router.get('/othello', async ctx => ctx.redirect(override(ctx.URL.pathname, 'games/reversi', 1)));
router.get('/reversi', async ctx => ctx.redirect(override(ctx.URL.pathname, 'games')));

// streamingに非WebSocketリクエストが来た場合にbase htmlをキャシュ付きで返すと、Proxy等でそのパスがキャッシュされておかしくなる
router.get('/streaming', async ctx => {
	console.log(`UNEXPECTED_STREAMING_1 ${ctx.path}`);
	ctx.status = 503;
	ctx.set('Cache-Control', 'private, max-age=0');
});

// Render base html for all requests
router.get('*', async ctx => {
	// streamingに非WebSocketリクエストが来た場合 (v9以前のEPのうちの != /)
	if (ctx.path === '/local-timeline'
		|| ctx.path === '/global-timeline'
		|| ctx.path === '/hybrid-timeline'
	) {
		console.log(`UNEXPECTED_STREAMING_2 ${ctx.path}`);
		ctx.status = 503;
		ctx.set('Cache-Control', 'private, max-age=0');
		return;
	}

	const meta = await fetchMeta();
	const builded = await buildMeta(meta, false);

	let desc = meta.description;
	try {
		desc = fromHtml(desc || '') || undefined;
	} catch { }

	await ctx.render('base', {
		initialMeta: htmlescape(builded),
		img: meta.bannerUrl,
		title: meta.name || 'Misskey',
		instanceName: meta.name || 'Misskey',
		desc,
		icon: config.icons?.favicon?.url,
		iconType: config.icons?.favicon?.type,
		appleTouchIcon: config.icons?.appleTouchIcon?.url,
	});

	ctx.set('Cache-Control', 'public, max-age=300');
});

// Register router
app.use(router.routes());

module.exports = app;
