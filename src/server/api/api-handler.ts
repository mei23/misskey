import * as Router from '@koa/router';

import { IEndpoint } from './endpoints';
import authenticate, { AuthenticationError } from './authenticate';
import call from './call';
import { ApiError } from './error';

export default (endpoint: IEndpoint, ctx: Router.RouterContext) => new Promise((res) => {
	const body: any = ctx.method === 'GET' ? ctx.query : ctx.request.body;

	const reply = (x?: any, y?: ApiError) => {
		if (x == null) {
			ctx.status = 204;
		} else if (typeof x === 'number') {
			ctx.status = x;
			ctx.body = {
				error: {
					message: y?.message,
					code: y?.code,
					id: y?.id,
					kind: y?.kind,
					...((y?.info && y.kind === 'client') ? { info: y.info } : {})
				}
			};
		} else {
			ctx.body = x;
		}
		res();
	};

	// Authentication
	authenticate(body['i']).then(([user, app]) => {
		// API invoking
		call(endpoint.name, user, app, body, ctx).then((res: any) => {
			if (ctx.method === 'GET' && endpoint.meta.cacheSec && !body['i'] && !user) {
				ctx.set('Cache-Control', `public, max-age=${endpoint.meta.cacheSec}`);
			}
			reply(res);
		}).catch(e => {
			reply(e.httpStatusCode ? e.httpStatusCode : e.kind == 'client' ? 400 : 500, e);
		});
	}).catch(e => {
		if (e instanceof AuthenticationError) {
			reply(403, new ApiError({
				message: 'Authentication failed. Please ensure your token is correct.',
				code: 'AUTHENTICATION_FAILED',
				id: 'b0a7f5f8-dc2f-4171-b91f-de88ad238e14'
			}));
		} else {
			reply(500, new ApiError());
		}
	});
});
