import { ObjectID } from 'mongodb';
import * as Router from '@koa/router';
import * as coBody from 'co-body';
import * as crypto from 'crypto';
import * as httpSignature from '@peertube/http-signature';

import { renderActivity } from '../remote/activitypub/renderer';
import Note, { INote } from '../models/note';
import User, { ILocalUser, IRemoteUser, isLocalUser, isRemoteUser } from '../models/user';
import Emoji from '../models/emoji';
import renderNote from '../remote/activitypub/renderer/note';
import renderPerson from '../remote/activitypub/renderer/person';
import renderEmoji from '../remote/activitypub/renderer/emoji';
import Outbox, { packActivity } from './activitypub/outbox';
import Followers from './activitypub/followers';
import Following from './activitypub/following';
import Featured from './activitypub/featured';
import Publickey from './activitypub/publickey';
import { inbox as processInbox, inboxLazy as processInboxLazy } from '../queue';
import { isSelfHost } from '../misc/convert-host';
import NoteReaction from '../models/note-reaction';
import { renderLike } from '../remote/activitypub/renderer/like';
import { inspect } from 'util';
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

//#region inbox
router.post(['/inbox', '/users/:user/inbox'], async (ctx: Router.RouterContext) => {
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

	let signature: httpSignature.IParsedSignature;

	try {
		signature = httpSignature.parseRequest(ctx.req, { 'headers': ['(request-target)', 'digest', 'host', 'date'] });
	} catch (e) {
		logger.warn(`inbox: signature parse error: ${inspect(e)}`);
		ctx.status = 401;

		if (e instanceof Error) {
			if (e.name === 'ExpiredRequestError') ctx.message = 'Expired Request Error';
			if (e.name === 'MissingHeaderError') ctx.message = 'Missing Required Header';
		}

		return;
	}

	// Validate signature algorithm
	if (!signature.algorithm.toLowerCase().match(/^((dsa|rsa|ecdsa)-(sha256|sha384|sha512)|ed25519-sha512|hs2019)$/)) {
		logger.warn(`inbox: invalid signature algorithm ${signature.algorithm}`);
		ctx.status = 401;
		ctx.message = 'Invalid Signature Algorithm';
		return;

		// hs2019
		// keyType=ED25519 => ed25519-sha512
		// keyType=other => (keyType)-sha256
	}

	// Digestヘッダーの検証
	const digest = ctx.req.headers.digest;

	// 無いとか複数あるとかダメ！
	if (typeof digest !== 'string') {
		logger.warn(`inbox: unrecognized digest header 1`);
		ctx.status = 401;
		ctx.message = 'Invalid Digest Header';
		return;
	}

	const match = digest.match(/^([0-9A-Za-z-]+)=(.+)$/);

	if (match == null) {
		logger.warn(`inbox: unrecognized digest header 2`);
		ctx.status = 401;
		ctx.message = 'Invalid Digest Header';
		return;
	}

	const digestAlgo = match[1];
	const digestExpected = match[2];

	if (digestAlgo.toUpperCase() !== 'SHA-256') {
		logger.warn(`inbox: Unsupported Digest Algorithm`);
		ctx.status = 401;
		ctx.message = 'Unsupported Digest Algorithm';
		return;
	}

	const digestActual = crypto.createHash('sha256').update(raw).digest('base64');

	if (digestExpected !== digestActual) {
		logger.warn(`inbox: Digest Missmatch`);
		ctx.status = 401;
		ctx.message = 'Digest Missmatch';
		return;
	}

	try {
		/** peer host (リレーから来たらリレー) */
		const host = toUnicode(new URL(signature.keyId).hostname.toLowerCase());

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

	const actor = signature.keyId.replace(/[^0-9A-Za-z]/g, '_');
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
});
//#endregion

//#region Util accept handling
const ACTIVITY_JSON = 'application/activity+json; charset=utf-8';
const LD_JSON = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"; charset=utf-8';

function isActivityPubReq(ctx: Router.RouterContext, preferAp = false) {
	ctx.response.vary('Accept');
	const accepted = preferAp
		? ctx.accepts(ACTIVITY_JSON, LD_JSON, 'html')
		: ctx.accepts('html', ACTIVITY_JSON, LD_JSON);
	return typeof accepted === 'string' && !accepted.match(/html/);
}

/**
 * Set respose content-type by requested one
 */
export function setResponseType(ctx: Router.RouterContext) {
	const accept = ctx.accepts(ACTIVITY_JSON, LD_JSON);
	if (accept === LD_JSON) {
		ctx.response.type = LD_JSON;
	} else {
		ctx.response.type = ACTIVITY_JSON;
	}
}
//#endregion

//#region notes
export const isNoteUserAvailable = async (note: INote) => {
	const user = await User.findOne({
		_id: note.userId,
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		noFederation: { $ne: true },
	});
	return user != null;
};

router.get(['/notes/:note', '/notes/:note/:activity'], async (ctx, next) => {
	if (isActivityPubReq(ctx) === false) return await next();
	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.note)) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=180');
		return;
	}

	let note = await Note.findOne({
		_id: new ObjectID(ctx.params.note),
		deletedAt: { $exists: false },
		visibility: { $in: ['public', 'home'] },
		localOnly: { $ne: true },
		copyOnce: { $ne: true }
	});

	if (note == null || await isNoteUserAvailable(note) === false) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=180');
		return;
	}

	// リモートだったらリダイレクト
	if (!ctx.params.activity && note._user.host != null) {
		if (note.uri == null || isSelfHost(note._user.host)) {
			ctx.status = 500;
			ctx.set('Cache-Control', 'public, max-age=30');
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

	ctx.body = renderActivity(await (ctx.params.activity ? packActivity(note) : renderNote(note, false)));
	
	// set cache header by note expires
	if (note.expiresAt) {
		const s = (note.expiresAt.getTime() - new Date().getTime()) / 1000;
		if (s < 180) {
			ctx.set('Expires', note.expiresAt.toUTCString());
			return;
		}
	}

	ctx.set('Cache-Control', 'public, max-age=180');

	setResponseType(ctx);
});
//#endregion

//#region users
//#region users utils
type UserDivision = 'local' | 'both';

/**
 * Get valid user by userId
 * @param userId userId
 * @param userDivision UserDivision to get
 * @returns user object or null
 */
async function getValidUser(userId: string, userDivision: 'local'): Promise<ILocalUser | null>;
async function getValidUser(userId: string, userDivision: 'both'): Promise<ILocalUser | IRemoteUser | null>;
async function getValidUser(userId: string, userDivision: UserDivision): Promise<ILocalUser | IRemoteUser | null> {
	if (ObjectID.isValid(userId) === false) return null;

	const user = await User.findOne({
		_id: new ObjectID(userId),
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		noFederation: { $ne: true },
		...(userDivision === 'local' ? { host: null } : {}),
	});

	if (user == null) return null;
	if (userDivision === 'local' && isLocalUser(user) === false) return null;

	return user;
};
//#endregion

//#region user by userId
router.get('/users/:userId', async (ctx, next) => {
	if (!isActivityPubReq(ctx, true)) return await next();
	if (config.disableFederation) ctx.throw(404);

	const user = await getValidUser(ctx.params.userId, 'both');
	if (user == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=180');
		return;
	}

	if (isRemoteUser(user)) {
		ctx.redirect(user.uri);
		return;
	}

	ctx.body = renderActivity(await renderPerson(user as ILocalUser));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});
//#endregion

//#region user by username
router.get('/@:username', async (ctx, next) => {
	if (isActivityPubReq(ctx) === false) return await next();
	if (config.disableFederation) ctx.throw(404);

	const user = await User.findOne({
		usernameLower: ctx.params.username.toLowerCase(),
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
		noFederation: { $ne: true },
		host: null
	}) as ILocalUser;

	if (user == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=180');
		return;
	}

	ctx.body = renderActivity(await renderPerson(user as ILocalUser));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});
//#endregion

//#region user objects
router.get(['/users/:userId/:obj', '/users/:userId/:obj/:obj2'], async (ctx, next) => {
	if (isActivityPubReq(ctx) === false) return await next();
	if (config.disableFederation) ctx.throw(404);

	const user = await getValidUser(ctx.params.userId, 'local');
	if (user == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=12');
		return;
	}

	const subPath = ctx.params.obj + (ctx.params.obj2 ? `/${ctx.params.obj2}` : '');

	switch (subPath) {
		case 'followers': await Followers(ctx, user); return;
		case 'following': await Following(ctx, user); return;
		case 'outbox': await Outbox(ctx, user); return;
		case 'publickey': await Publickey(ctx, user); return;
		case 'collections/featured': await Featured(ctx, user); return;
		default:
			ctx.status = 404;
			ctx.set('Cache-Control', 'public, max-age=13');
			return;
	}
});
//#endregion

//#endregion users

// emoji
router.get('/emojis/:emoji', async ctx => {
	if (config.disableFederation) ctx.throw(404);

	const emoji = await Emoji.findOne({
		host: null,
		name: ctx.params.emoji
	});

	if (emoji == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=180');
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
		ctx.set('Cache-Control', 'public, max-age=180');
		return;
	}

	const reaction = await NoteReaction.findOne({
		_id: new ObjectID(ctx.params.like)
	});

	if (reaction == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=180');
		return;
	}

	const note = await Note.findOne({
		_id: reaction.noteId
	});

	if (note == null) {
		ctx.status = 404;
		ctx.set('Cache-Control', 'public, max-age=180');
		return;
	}

	ctx.body = renderActivity(await renderLike(reaction, note));
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
});

export default router;
