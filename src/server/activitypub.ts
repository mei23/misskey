import { ObjectID } from 'mongodb';
import * as Router from '@koa/router';
import * as json from 'koa-json-body';
import * as httpSignature from 'http-signature';

import { renderActivity } from '../remote/activitypub/renderer';
import Note, { INote } from '../models/note';
import User, { isLocalUser, ILocalUser, IUser } from '../models/user';
import Emoji from '../models/emoji';
import renderNote from '../remote/activitypub/renderer/note';
import renderKey from '../remote/activitypub/renderer/key';
import renderPerson from '../remote/activitypub/renderer/person';
import renderEmoji from '../remote/activitypub/renderer/emoji';
import Outbox, { packActivity } from './activitypub/outbox';
import Followers from './activitypub/followers';
import Following from './activitypub/following';
import Featured from './activitypub/featured';
import { inbox as processInbox } from '../queue';
import { isSelfHost } from '../misc/convert-host';
import NoteReaction from '../models/note-reaction';
import { renderLike } from '../remote/activitypub/renderer/like';
import { inspect } from 'util';
import config from '../config';

// Init router
const router = new Router();

//#region Routing

async function inbox(ctx: Router.RouterContext) {
	if (config.disableFederation) ctx.throw(404);

	let signature;

	try {
		signature = httpSignature.parseRequest(ctx.req, { 'headers': [] });
	} catch (e) {
		console.log(`signature parse error: ${inspect(e)}`);
		ctx.status = 401;
		return;
	}

	const queue = await processInbox(ctx.request.body, signature, {
		ip: ctx.request.ip
	});

	ctx.status = 202;
	ctx.body = {
		queueId: queue.id,
	};
}

const ACTIVITY_JSON = 'application/activity+json; charset=utf-8';
const LD_JSON = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"; charset=utf-8';

function isActivityPubReq(ctx: Router.RouterContext, preferAp = false) {
	ctx.response.vary('Accept');
	const accepted = preferAp
		? ctx.accepts(ACTIVITY_JSON, LD_JSON, 'html')
		: ctx.accepts('html', ACTIVITY_JSON, LD_JSON);
	return typeof accepted === 'string' && !accepted.match(/html/);
}

export function setResponseType(ctx: Router.RouterContext) {
	const accept = ctx.accepts(ACTIVITY_JSON, LD_JSON);
	if (accept === LD_JSON) {
		ctx.response.type = LD_JSON;
	} else {
		ctx.response.type = ACTIVITY_JSON;
	}
}

// inbox
router.post('/inbox', json() as any, inbox);
router.post('/users/:user/inbox', json() as any, inbox);

const isNoteUserAvailable = async (note: INote) => {
	const user = await User.findOne({
		_id: note.userId,
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		noFederation: { $ne: true },
	});
	return user != null;
};

// note
router.get('/notes/:note', async (ctx, next) => {
	if (!isActivityPubReq(ctx)) return await next();

	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.note)) {
		ctx.status = 404;
		return;
	}

	const note = await Note.findOne({
		_id: new ObjectID(ctx.params.note),
		deletedAt: { $exists: false },
		visibility: { $in: ['public', 'home'] },
		localOnly: { $ne: true },
		copyOnce: { $ne: true }
	});

	if (note == null || !await isNoteUserAvailable(note)) {
		ctx.status = 404;
		return;
	}

	// リモートだったらリダイレクト
	if (note._user.host != null) {
		if (note.uri == null || isSelfHost(note._user.host)) {
			ctx.status = 500;
			return;
		}
		ctx.redirect(note.uri);
		return;
	}

	ctx.body = renderActivity(await renderNote(note, false));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});

// note activity
router.get('/notes/:note/activity', async ctx => {
	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.note)) {
		ctx.status = 404;
		return;
	}

	const note = await Note.findOne({
		_id: new ObjectID(ctx.params.note),
		deletedAt: { $exists: false },
		'_user.host': null,
		visibility: { $in: ['public', 'home'] },
		localOnly: { $ne: true },
		copyOnce: { $ne: true }
	});

	if (note == null || !await isNoteUserAvailable(note)) {
		ctx.status = 404;
		return;
	}

	ctx.body = renderActivity(await packActivity(note));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});

// outbox
router.get('/users/:user/outbox', Outbox);

// followers
router.get('/users/:user/followers', Followers);

// following
router.get('/users/:user/following', Following);

// featured
router.get('/users/:user/collections/featured', Featured);

// publickey
router.get('/users/:user/publickey', async ctx => {
	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.user)) {
		ctx.status = 404;
		return;
	}

	const userId = new ObjectID(ctx.params.user);

	const user = await User.findOne({
		_id: userId,
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		noFederation: { $ne: true },
		host: null
	});

	if (user === null) {
		ctx.status = 404;
		return;
	}

	if (isLocalUser(user)) {
		ctx.body = renderActivity(renderKey(user));
		ctx.set('Cache-Control', 'public, max-age=180');
		setResponseType(ctx);
	} else {
		ctx.status = 400;
	}
});

// user
async function userInfo(ctx: Router.RouterContext, user?: IUser | null) {
	if (user == null) {
		ctx.status = 404;
		return;
	}

	ctx.body = renderActivity(await renderPerson(user as ILocalUser));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
}

router.get('/users/:user', async (ctx, next) => {
	if (!isActivityPubReq(ctx, true)) return await next();

	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.user)) {
		ctx.status = 404;
		return;
	}

	const userId = new ObjectID(ctx.params.user);

	const user = await User.findOne({
		_id: userId,
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		noFederation: { $ne: true },
		host: null
	});

	await userInfo(ctx, user);
});

router.get('/@:user', async (ctx, next) => {
	if (!isActivityPubReq(ctx)) return await next();

	if (config.disableFederation) ctx.throw(404);

	const user = await User.findOne({
		usernameLower: ctx.params.user.toLowerCase(),
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		noFederation: { $ne: true },
		host: null
	});

	await userInfo(ctx, user);
});
//#endregion

// emoji
router.get('/emojis/:emoji', async ctx => {
	if (config.disableFederation) ctx.throw(404);

	const emoji = await Emoji.findOne({
		host: null,
		name: ctx.params.emoji
	});

	if (emoji == null) {
		ctx.status = 404;
		return;
	}

	ctx.body = renderActivity(await renderEmoji(emoji));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});

// like
router.get('/likes/:like', async ctx => {
	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.like)) {
		ctx.status = 404;
		return;
	}

	const reaction = await NoteReaction.findOne({
		_id: new ObjectID(ctx.params.like)
	});

	if (reaction == null) {
		ctx.status = 404;
		return;
	}

	const note = await Note.findOne({
		_id: reaction.noteId
	});

	if (note == null) {
		ctx.status = 404;
		return;
	}

	ctx.body = renderActivity(await renderLike(reaction, note));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});

export default router;
