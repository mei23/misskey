/**
 * API Server
 */


import endpoints from './endpoints';
import handler from './api-handler';
import signup from './private/signup';
import signin from './private/signin';
import discord from './service/discord';
import github from './service/github';
import twitter from './service/twitter';
import Instance from '../../models/instance';
import { toApHost } from '../../misc/convert-host';
import { unique } from '../../prelude/array';
import config from '../../config';
import * as Fastify from 'fastify';
import fastifyStatic from 'fastify-static';
import pointOfView from 'point-of-view';
const httpSignature = require('http-signature');
import * as path from 'path';
import * as pug from 'pug';
import cors from 'fastify-cors';

export default async (server: Fastify.FastifyInstance, opts: Fastify.FastifyPluginOptions, done: (err?: Error) => void) => {
	server.register(cors);	// scoped

	// Misskey Webが送ってくるtext/plainはjsonとして扱わないといけない
	server.addContentTypeParser('text/plain', { parseAs: 'string' }, (server as any).getDefaultJsonParser('ignore', 'ignore'));

	// default response header
	server.addHook('preHandler', async (request, reply) => {
		reply
			.header('Cache-Control', 'private, max-age=0, must-revalidate');
	});

	for (const endpoint of endpoints) {
		if (endpoint.meta.requireFile) {
		//	server.post(`/${endpoint.name}`, upload.single('file'), handler.bind(null, endpoint)); TODO
		} else {
			if (endpoint.name.includes('-')) {
				// 後方互換性のため
				server.post(`/${endpoint.name.replace(/\-/g, '_')}`, handler.bind(null, endpoint));
			}
			server.post(`/${endpoint.name}`, handler.bind(null, endpoint));

			if (endpoint.meta.allowGet) {
				server.get(`/${endpoint.name}`, handler.bind(null, endpoint));
			} else {
				server.get(`/${endpoint.name}`, async (request, reply) => {
					reply
						.header('Allow', 'POST')
						.methodNotAllowed('Must be a POST');
				});
			}
		}
	}

	server.post('/signup', signup);
	server.post('/signin', signin);

	server.get('*', async (request, reply) => {
		reply.notFound('Unknown API');
	});

	done();
};

/*
// Handle error
app.use(async (ctx, next) => {
	try {
		await next();
	} catch (err) {
		if (err.code === 'LIMIT_FILE_SIZE') {
			ctx.throw('File to large', 413);
			return;
		}
		ctx.app.emit('error', err, ctx);
	}
});

// Init multer instance
const upload = multer({
	storage: multer.diskStorage({}),
	limits: {
		fileSize: config.maxFileSize || 262144000,
		files: 1,
	}
});

// Init router
const router = new Router();


router.use(discord.routes());
router.use(github.routes());
router.use(twitter.routes());

router.get('/v1/instance/peers', async ctx => {
	if (config.disableFederation) ctx.throw(404);

	const instances = await Instance.find({
		}, {
			host: 1
		});

	const punyCodes = unique(instances.map(instance => toApHost(instance.host)));

	ctx.body = punyCodes;
	ctx.set('Cache-Control', 'public, max-age=600');
});

// Return 404 for unknown API
router.all('*', async ctx => {
	ctx.status = 404;
});
*/
