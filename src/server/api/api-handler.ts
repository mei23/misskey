import * as Fastify from 'fastify';
import { IEndpoint } from './endpoints';
import authenticate from './authenticate';
import call from './call';
import { ApiError } from './error';

export default (endpoint: IEndpoint, req: Fastify.FastifyRequest, rep: Fastify.FastifyReply) => new Promise((res) => {
	const body: any = req.method === 'GET' ? req.query : (req.body || {});

	const reply = (x?: any, y?: ApiError) => {
		if (x == null) {
			rep.code(204);
		} else if (typeof x === 'number') {
			rep.code(x);
			rep.send({
				error: {
					message: y.message,
					code: y.code,
					id: y.id,
					kind: y.kind,
					...(y.info ? { info: y.info } : {})
				}
			});
		} else {
			rep.send(x);
		}
		res();
	};

	// Authentication
	authenticate(body['i']).then(([user, app]) => {
		// API invoking
		call(endpoint.name, user, app, body, (req as any).file, req.ip).then((res: any) => {
			if (req.method === 'GET' && endpoint.meta.cacheSec && !body['i'] && !user) {
				rep.header('Cache-Control', `public, max-age=${endpoint.meta.cacheSec}`);
			}
			reply(res);
		}).catch(e => {
			reply(e.httpStatusCode ? e.httpStatusCode : e.kind == 'client' ? 400 : 500, e);
		});
	}).catch(() => {
		reply(403, new ApiError({
			message: 'Authentication failed. Please ensure your token is correct.',
			code: 'AUTHENTICATION_FAILED',
			id: 'b0a7f5f8-dc2f-4171-b91f-de88ad238e14'
		}));
	});
});
