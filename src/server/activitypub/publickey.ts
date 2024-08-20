import * as Router from '@koa/router';
import { ILocalUser } from '../../models/user';
import { renderActivity } from '../../remote/activitypub/renderer';
import { setResponseType } from '../activitypub';
import renderKey from '../../remote/activitypub/renderer/key';

export default async (ctx: Router.RouterContext, user: ILocalUser) => {
	ctx.body = renderActivity(renderKey(user));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
};
