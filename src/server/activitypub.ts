import { ObjectID } from 'mongodb';
import * as Router from '@koa/router';
import * as coBody from 'co-body';
import { verifyDigestHeader, parseRequestSignature } from '@misskey-dev/node-http-message-signatures';
import { renderActivity } from '../remote/activitypub/renderer';
import Note, { INote } from '../models/note';
import User, { isLocalUser, ILocalUser, IUser, isRemoteUser } from '../models/user';
import Emoji from '../models/emoji';
import renderNote from '../remote/activitypub/renderer/note';
import renderKey from '../remote/activitypub/renderer/key';
import renderPerson from '../remote/activitypub/renderer/person';
import renderEmoji from '../remote/activitypub/renderer/emoji';
import Likes from './activitypub/likes';
import Outbox, { packActivity } from './activitypub/outbox';
import Followers from './activitypub/followers';
import Following from './activitypub/following';
import Featured from './activitypub/featured';
import { inbox as processInbox, inboxLazy as processInboxLazy } from '../queue';
import { isSelfHost } from '../misc/convert-host';
import NoteReaction from '../models/note-reaction';
import { renderLike } from '../remote/activitypub/renderer/like';
import config from '../config';
import fetchMeta from '../misc/fetch-meta';
import { isBlockedHost } from '../services/instance-moderation';
import { toUnicode } from 'punycode/';
import Logger from '../services/logger';
import limiter from './api/limiter';
import { IEndpoint } from './api/endpoints';
import { IActivity, getApId } from '../remote/activitypub/type';
import { toSingle } from '../prelude/array';

const logger = new Logger('activitypub');

// Init router
const router = new Router();

//#region Routing

async function inbox(ctx: Router.RouterContext) {
	if (config.disableFederation) ctx.throw(404);

	if (ctx.req.headers.host !== config.host) {
		logger.warn(`inbox: Invalid Host`);
		ctx.status = 400;
		ctx.message = 'Invalid Host';
		return;
	}

	// parse body
	const { parsed, raw } = await coBody.json(ctx, {
		limit: '64kb',
		returnRawBody: true,
	});
	ctx.request.body = parsed;

	if (raw == null) {
		ctx.status = 400;
		return;
	}

	let signature: ReturnType<typeof parseRequestSignature>;

	// Digestヘッダーの検証
	if (!verifyDigestHeader(ctx.req, raw, true)) {
		logger.warn(`inbox: invalid Digest`);
		ctx.status = 401;
		ctx.message = 'Invalid Digest';
		return;
	}

	try {
		signature = parseRequestSignature(ctx.req, {
			requiredInputs: {
				draft: ['(request-target)', 'digest', 'host', 'date'],
				// rfc9421: ['(request-target)', 'digest', 'host', 'date'], TODO
			}
		});
	} catch (e: any) {
		logger.warn(`inbox: ${e.message}`);
		ctx.status = 401;
		return;
	}

	try {
		/** peer host (リレーから来たらリレー) */
		const host = toUnicode(new URL(signature.value.keyId).hostname.toLowerCase());

		// ブロックしてたら中断
		if (await isBlockedHost(host)) {
			logger.info(`inbox: blocked instance ${host}`);
			ctx.status = 403;
			return;
		}
	} catch (e) {
		logger.warn(`inbox: error ${e}`);
		ctx.status = 400;
		return;
	}

	const actor = signature.value.keyId.replace(/[^0-9A-Za-z]/g, '_');
	const activity = ctx.request.body as IActivity;

	let lazy = false;

	// MassDel
	if (actor && ['Delete', 'Undo'].includes(toSingle(activity.type)!)) {
		const ep = {
			name: `inboxDeletex60-${actor}`,
			exec: null,
			meta: {
				limit: {
					duration: 60 * 1000,
					max: 10, //TODO
				}
			}
		} as IEndpoint;

		try {
			await limiter(ep, undefined, undefined);
		} catch (e) {
			console.log(`InboxLimit: ${actor}`);
			if (config.inboxMassDelOpeMode === 'ignore') {
				ctx.status = 202;
				return;
			}
			lazy = true;
		}
	}

	// ForeignLike
	if (['Like', 'Dislike', 'EmojiReaction', 'EmojiReact'].includes(toSingle(activity.type)!)) {
		let targetHost: string;
		try {
			targetHost = new URL(getApId(activity.object)).hostname.toLowerCase();
		} catch {
			ctx.status = 400;
			return;
		}
		if (targetHost !== config.host) {
			if (config.inboxForeignLikeOpeMode === 'ignore') {
				ctx.status = 202;
				return;
			}
			lazy = true;
		}
	}

	
	const queue = await (lazy ? processInboxLazy : processInbox)(activity, signature, {
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

function setCacheHeader(ctx: Router.RouterContext, note: INote) {
	if (note.expiresAt) {
		const s = (note.expiresAt.getTime() - new Date().getTime()) / 1000;
		if (s < 180) {
			ctx.set('Expires', note.expiresAt.toUTCString());
			return;
		}
	}

	ctx.set('Cache-Control', 'public, max-age=180');
	return;
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
router.post('/inbox', inbox);
router.post('/users/:user/inbox', inbox);

export const isNoteUserAvailable = async (note: INote) => {
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

	let note = await Note.findOne({
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

	const meta = await fetchMeta();
	if (meta.exposeHome) {
		note = Object.assign(note, {
			visibility: 'home'
		});
	}

	ctx.body = renderActivity(await renderNote(note, false));
	setCacheHeader(ctx, note);
	setResponseType(ctx);
});

// note activity
router.get('/notes/:note/activity', async ctx => {
	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.note)) {
		ctx.status = 404;
		return;
	}

	let note = await Note.findOne({
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

	const meta = await fetchMeta();
	if (meta.exposeHome) {
		note = Object.assign(note, {
			visibility: 'home'
		});
	}

	ctx.body = renderActivity(await packActivity(note));
	setCacheHeader(ctx, note);
	setResponseType(ctx);
});

// likes
router.get('/notes/:note/likes', Likes);

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
		ctx.body = renderActivity(renderKey(user, user.keypair));
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
	});

	if (isRemoteUser(user)) {
		ctx.redirect(user.uri);
		return;
	}

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
