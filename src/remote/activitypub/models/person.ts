import * as mongo from 'mongodb';
import * as promiseLimit from 'promise-limit';
import { toUnicode } from 'punycode/';

import $, { Context } from 'cafy';
import config from '../../../config';
import User, { IUser, IRemoteUser, isRemoteUser } from '../../../models/user';
import Resolver from '../resolver';
import { resolveImage } from './image';
import { isCollectionOrOrderedCollection, isCollection, isOrderedCollection, IObject, isActor, IActor, isPropertyValue, IApPropertyValue, ApObject, getApIds, getOneApHrefNullable, isOrderedCollectionPage, isCreate, isPost, getApType, getApId, IApImage } from '../type';
import Meta from '../../../models/meta';
import { fromHtml } from '../../../mfm/from-html';
import { htmlToMfm } from '../misc/html-to-mfm';
import usersChart from '../../../services/chart/users';
import instanceChart from '../../../services/chart/instance';
import { URL } from 'url';
import { resolveNote, extractEmojis } from './note';
import { registerOrFetchInstanceDoc } from '../../../services/register-or-fetch-instance-doc';
import Instance from '../../../models/instance';
import getDriveFileUrl from '../../../misc/get-drive-file-url';
import { IEmoji } from '../../../models/emoji';
import { extractApHashtags } from './tag';
import Following from '../../../models/following';
import { apLogger } from '../logger';
import { INote } from '../../../models/note';
import { updateUsertags } from '../../../services/update-hashtag';
import { toArray, toSingle } from '../../../prelude/array';
import { UpdateInstanceinfo } from '../../../services/update-instanceinfo';
import { extractDbHost } from '../../../misc/convert-host';
import DbResolver from '../db-resolver';
import resolveUser from '../../resolve-user';
import { normalizeTag } from '../../../misc/normalize-tag';
import { substr } from 'stringz';
import { resolveAnotherUser } from '../resolve-another-user';
import { StatusError } from '../../../misc/fetch';
const logger = apLogger;

const MAX_NAME_LENGTH = 512;
const MAX_SUMMARY_LENGTH = 8192;

const truncate = (value: string, maxLength: number) => {
	return substr(value, 0, maxLength);
}

/**
 * Validate and convert to actor object
 * @param x Fetched object
 * @param uri Fetch target URI
 */
function validateActor(x: IObject, uri: string): IActor {
	const expectHost = toUnicode(new URL(uri).hostname.toLowerCase());

	if (x == null) {
		throw new Error('invalid Actor: object is null');
	}

	if (!isActor(x)) {
		throw new Error(`invalid Actor type '${x.type}'`);
	}

	const validate = (name: string, value: any, validater: Context) => {
		const e = validater.test(value);
		if (e) throw new Error(`invalid Actor: ${name} ${e.message}`);
	};

	validate('id', x.id, $.str.min(1));
	validate('inbox', x.inbox, $.str.min(1));
	validate('preferredUsername', x.preferredUsername, $.str.min(1).max(128).match(/^\w([\w-.]*\w)?$/));
	validate('name', x.name, $.optional.nullable.str);
	validate('summary', x.summary, $.optional.nullable.str);

	// サロゲートペアは2文字としてカウントされるので、サロゲートペアと合字を考慮して大きめにしておく
	validate('name', x.name, $.optional.nullable.str.max(512));

	// 入力値はHTMLなので大きめにしておく
	validate('summary', x.summary, $.optional.nullable.str.max(8192));

	const idHost = toUnicode(new URL(x.id!).hostname.toLowerCase());
	if (idHost !== expectHost) {
		throw new Error('invalid Actor: id has different host');
	}

	if (x.publicKey) {
		if (typeof x.publicKey.id !== 'string') {
			throw new Error('invalid Actor: publicKey.id is not a string');
		}

		const publicKeyIdHost = toUnicode(new URL(x.publicKey.id).hostname.toLowerCase());
		if (publicKeyIdHost !== expectHost) {
			throw new Error('invalid Actor: publicKey.id has different host');
		}
	}

	return x;
}

/**
 * Personをフェッチします。
 *
 * Misskeyに対象のPersonが登録されていればそれを返します。
 */
export async function fetchPerson(uri: string): Promise<IUser | null> {
	if (typeof uri !== 'string') throw 'uri is not string';

	const dbResolver = new DbResolver();
	return await dbResolver.getUserFromApId(uri);
}

/**
 * Personを作成します。
 */
export async function createPerson(uri: string, resolver?: Resolver): Promise<IRemoteUser> {
	if (typeof uri !== 'string') throw 'uri is not string';

	if (uri.startsWith(config.url)) {
		throw new StatusError('cannot resolve local user', 400, 'cannot resolve local user');
	}

	if (resolver == null) resolver = new Resolver();

	const object = await resolver.resolve(uri);

	const person = validateActor(object, uri);

	logger.info(`Creating the Person: ${person.id}`);

	const [followersCount = -1, followingCount = -1, notesCount = 0] = await Promise.all([
		-1,
		-1,
		getCollectionCount(person.outbox, resolver).catch(() => undefined),
	]);

	const host = toUnicode(new URL(getApId(object)).hostname.toLowerCase());

	const { fields, services } = analyzeAttachments(person.attachment);

	const tags = extractApHashtags(person.tag).map(tag => normalizeTag(tag)).splice(0, 64);

	const movedTo = (person.id && person.movedTo)
		? await resolveAnotherUser(person.id, person.movedTo, resolver)
			.catch(e => {
				logger.warn(`Error in movedTo: ${e}`);
				return null;
			})
		: null;

	const bday = person['vcard:bday']?.match(/^[0-9]{4,8}-\d{2}-\d{2}/);

	// Create user
	let user: IRemoteUser | undefined;
	try {
		user = await User.insert({
			avatarId: null,
			bannerId: null,
			createdAt: new Date(),
			lastFetchedAt: new Date(),
			description: person.summary ? htmlToMfm(truncate(person.summary, MAX_SUMMARY_LENGTH), person.tag) : '',
			followersCount,
			followingCount,
			notesCount,
			name: person.name ? truncate(person.name, MAX_NAME_LENGTH) : person.name,
			isLocked: person.manuallyApprovesFollowers,
			isExplorable: !!person.discoverable,
			username: person.preferredUsername,
			usernameLower: person.preferredUsername.toLowerCase(),
			host,
			publicKey: person.publicKey ? {
				id: person.publicKey.id,
				publicKeyPem: person.publicKey.publicKeyPem
			} : undefined,
			inbox: person.inbox,
			sharedInbox: person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined),
			outbox: person.outbox,
			featured: person.featured,
			endpoints: person.endpoints,
			uri: person.id,
			movedToUserId: movedTo?._id || null,
			url: getOneApHrefNullable(person.url),
			fields,
			...services,
			tags,
			profile: {
				birthday: bday ? bday[0] : undefined,
				location: person['vcard:Address'] || undefined,
			},
			isBot: getApType(object) === 'Service',
			isGroup: getApType(object) === 'Group',
			isOrganization: getApType(object) === 'Organization',
			isCat: (person as any).isCat === true
		}) as IRemoteUser;
	} catch (e) {
		// duplicate key error
		if (e.code === 11000) {
			// 同じ@username@host を持つものがあった場合、被った先を返す
			const u = await User.findOne({
				uri: { $ne: person.id },
				usernameLower: person.preferredUsername.toLowerCase(),
				host
			});

			if (u) {
				throw {
					code: 'DUPLICATED_USERNAME',
					with: u,
				};
			}

			logger.error(e);
			throw e;
		} else {
			logger.error(e);
			throw e;
		}
	}

	// Register host
	registerOrFetchInstanceDoc(host).then(i => {
		Instance.update({ _id: i._id }, {
			$inc: {
				usersCount: 1
			}
		});

		UpdateInstanceinfo(i);

		instanceChart.newUser(i.host);
	});

	//#region Increment users count
	Meta.update({}, {
		$inc: {
			'stats.usersCount': 1
		}
	}, { upsert: true });

	usersChart.update(user, true);
	//#endregion

	// ハッシュタグ更新
	updateUsertags(user, tags);

	//#region アイコンとヘッダー画像をフェッチ
	const [avatar, banner] = await Promise.all([
		fetchImage(user, person.icon).catch(() => null),
		fetchImage(user, person.image).catch(() => null),
	]);

	const avatarId = avatar ? avatar._id : null;
	const bannerId = banner ? banner._id : null;
	const avatarUrl = getDriveFileUrl(avatar, true);
	const bannerUrl = getDriveFileUrl(banner, false);
	const avatarColor = null;
	const bannerColor = null;

	await User.update({ _id: user._id }, {
		$set: {
			avatarId,
			bannerId,
			avatarUrl,
			bannerUrl,
			avatarColor,
			bannerColor
		}
	});

	user.avatarId = avatarId;
	user.bannerId = bannerId;
	user.avatarUrl = avatarUrl;
	user.bannerUrl = bannerUrl;
	user.avatarColor = avatarColor;
	user.bannerColor = bannerColor;
	//#endregion

	//#region カスタム絵文字取得
	const emojis = await extractEmojis(person.tag || [], host).catch(e => {
		logger.info(`extractEmojis: ${e}`);
		return [] as IEmoji[];
	});

	const emojiNames = emojis.map(emoji => emoji.name);

	await User.update({ _id: user._id }, {
		$set: {
			emojis: emojiNames
		}
	});
	//#endregion

	await updateFeatured(user._id).catch(err => logger.error(err));

	return user;
}

/**
 * Personの情報を更新します。
 * Misskeyに対象のPersonが登録されていなければ無視します。
 * @param uri URI of Person
 * @param resolver Resolver
 * @param hint Hint of Person object (この値が正当なPersonの場合、Remote resolveをせずに更新に利用します)
 */
export async function updatePerson(uri: string, resolver?: Resolver, hint?: IActor): Promise<void> {
	if (typeof uri !== 'string') throw 'uri is not string';

	// URIがこのサーバーを指しているならスキップ
	if (uri.startsWith(config.url + '/')) {
		return;
	}

	//#region このサーバーに既に登録されているか
	const exist = await User.findOne({ uri }) as IRemoteUser;

	if (exist == null) {
		return;
	}
	//#endregion

	if (resolver == null) resolver = new Resolver();

	const object = hint || await resolver.resolve(uri) as any;

	const person = validateActor(object, uri);

	logger.info(`Updating the Person: ${person.id}`);

	const [followersCount = -1, followingCount = -1, notesCount = 0] = await Promise.all([
		-1,
		-1,
		getCollectionCount(person.outbox, resolver).catch(() => undefined),
	]);

	// アイコンとヘッダー画像をフェッチ
	const [avatar, banner] = await Promise.all([
		fetchImage(exist, person.icon).catch(() => null),
		fetchImage(exist, person.image).catch(() => null),
	]);

	// カスタム絵文字取得
	const emojis = await extractEmojis(person.tag || [], exist.host).catch(e => {
		logger.info(`extractEmojis: ${e}`);
		return [] as IEmoji[];
	});

	const emojiNames = emojis.map(emoji => emoji.name);

	const { fields, services } = analyzeAttachments(person.attachment);

	const tags = extractApHashtags(person.tag).map(tag => normalizeTag(tag)).splice(0, 64);

	const movedTo = (person.id && person.movedTo)
		? await resolveAnotherUser(person.id, person.movedTo, resolver)
			.catch(e => {
				logger.warn(`Error in movedTo: ${e}`);
				return null;
			})
		: null;

	const bday = person['vcard:bday']?.match(/^[0-9]{4,8}-\d{2}-\d{2}/);

	const updates = {
		lastFetchedAt: new Date(),
		inbox: person.inbox,
		sharedInbox: person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined),
		outbox: person.outbox,
		featured: person.featured,
		emojis: emojiNames,
		description: person.summary ? htmlToMfm(truncate(person.summary, MAX_SUMMARY_LENGTH), person.tag) : '',
		followersCount,
		followingCount,
		notesCount,
		name: person.name ? truncate(person.name, MAX_NAME_LENGTH) : person.name,
		movedToUserId: movedTo?._id || null,
		url: getOneApHrefNullable(person.url),
		endpoints: person.endpoints,
		fields,
		...services,
		tags,
		profile: {
			birthday: bday ? bday[0] : undefined,
			location: person['vcard:Address'] || undefined,
		},
		isBot: getApType(object) === 'Service',
		isGroup: getApType(object) === 'Group',
		isOrganization: getApType(object) === 'Organization',
		isCat: (person as any).isCat === true,
		isLocked: person.manuallyApprovesFollowers,
		isExplorable: !!person.discoverable,
		publicKey: person.publicKey ? {
			id: person.publicKey.id,
			publicKeyPem: person.publicKey.publicKeyPem
		} : undefined,
	} as any;

	if (avatar) {
		updates.avatarId = avatar._id;
		updates.avatarUrl = getDriveFileUrl(avatar, true);
		updates.avatarColor = null;
	}

	if (banner) {
		updates.bannerId = banner._id;
		updates.bannerUrl = getDriveFileUrl(banner, true);
		updates.bannerColor = null;
	}

	// Update user
	await User.update({ _id: exist._id }, {
		$set: updates
	});

	// ハッシュタグ更新
	updateUsertags(exist, tags);

	// 該当ユーザーが既にフォロワーになっていた場合はFollowingもアップデートする
	await Following.update({
		followerId: exist._id
	}, {
		$set: {
			'_follower.sharedInbox': person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined)
		}
	}, {
		multi: true
	});

	await updateFeatured(exist._id).catch(err => logger.error(err));

	registerOrFetchInstanceDoc(extractDbHost(uri)).then(i => {
		UpdateInstanceinfo(i);
	});
}

/**
 * Personを解決します。
 *
 * Misskeyに対象のPersonが登録されていればそれを返し、そうでなければ
 * リモートサーバーからフェッチしてMisskeyに登録しそれを返します。
 */
export async function resolvePerson(uri: string, verifier?: string | null, resolver?: Resolver, noResolve = false): Promise<IUser> {
	if (typeof uri !== 'string') throw 'uri is not string';

	//#region このサーバーに既に登録されていたらそれを返す
	const exist = await fetchPerson(uri);

	if (exist) {
		return exist;
	}
	//#endregion

	if (noResolve) {
		throw new StatusError('Resolve skipped', 400, 'Resolve skipped');
	}

	// リモートサーバーからフェッチしてきて登録
	if (resolver == null) resolver = new Resolver();

	let user: IUser | null = null;

	try {
		user = await createPerson(uri, resolver);
	} catch (e) {
		if (e.code === 'DUPLICATED_USERNAME') {
			// uriからresolveしたユーザーを作成しようとしたら同じ @username@host が既に存在した場合にここに来る
			const existUser = e.with as IRemoteUser;
			logger.warn(`Duplicated username. input(uri=${uri}) exist(uri=${existUser.uri} username=${existUser.username}, host=${existUser.host})`);

			// WebFinger(@username@host)からresync をトリガする (24時間以上古い場合)
			resolveUser(existUser.username, existUser.host);
		}

		throw e;
	}

	return user;
}

const services: {
		[x: string]: (id: string, username: string) => any
	} = {
	'misskey:authentication:twitter': (userId, screenName) => ({ userId, screenName }),
	'misskey:authentication:github': (id, login) => ({ id, login }),
	'misskey:authentication:discord': (id, name) => $discord(id, name)
};

const $discord = (id: string, name: string) => {
	if (typeof name !== 'string')
		name = 'unknown#0000';
	const [username, discriminator] = name.split('#');
	return { id, username, discriminator };
};

function addService(target: { [x: string]: any }, source: IApPropertyValue) {
	const service = services[source.name];

	if (typeof source.value !== 'string')
		source.value = 'unknown';

	const [id, username] = source.value.split('@');

	if (service)
		target[source.name.split(':')[2]] = service(id, username);
}

async function getCollectionCount(value: IObject | string | undefined, resolver: Resolver) {
	if (value == null) return undefined;
	const resolved = await resolver.resolve(value);
	return isCollectionOrOrderedCollection(resolved) ? resolved.totalItems : undefined
}

async function fetchImage(actor: IRemoteUser, value: IApImage | IApImage[] | undefined) {
	if (value == null) return null;
	const first = toSingle(value);
	if (first == null) return null;
	return await resolveImage(actor, first);
}

export function analyzeAttachments(attachments: IObject | IObject[] | undefined) {
	attachments = toArray(attachments);

	const fields: {
		name: string,
		value: string
	}[] = [];

	const services: { [x: string]: any } = {};

	for (const attachment of attachments.filter(isPropertyValue)) {
		if (isPropertyValue(attachment.identifier)) {
			addService(services, attachment.identifier);
		} else {
			fields.push({
				name: attachment.name,
				value: fromHtml(attachment.value) || ''
			});
		}
	}

	return { fields, services };
}

export async function updateFeatured(userId: mongo.ObjectID) {
	const user = await User.findOne({ _id: userId });
	if (!isRemoteUser(user)) return;
	if (!user.featured) return;

	logger.info(`Updating the featured: ${user.uri}`);

	const resolver = new Resolver();

	// Resolve to (Ordered)Collection Object
	const collection = await resolver.resolveCollection(user.featured);
	if (!isCollectionOrOrderedCollection(collection)) throw new Error(`Object is not Collection or OrderedCollection`);

	// Resolve to Object(may be Note) arrays
	const unresolvedItems = isCollection(collection) ? collection.items : collection.orderedItems;
	const items = await Promise.all(toArray(unresolvedItems).map(x => resolver.resolve(x)));

	// Resolve and regist Notes
	const limit = promiseLimit(2);
	const featuredNotes = await Promise.all(items
		.filter(item => getApType(item) === 'Note')	// TODO: Noteでなくてもいいかも
		.slice(0, 20)
		.map(item => limit(() => resolveNote(item, resolver)) as Promise<INote>));

	await User.update({ _id: user._id }, {
		$set: {
			pinnedNoteIds: featuredNotes.filter(note => note != null).map(note => note._id)
		}
	});
}

export async function fetchOutbox(user: IUser) {
	if (!isRemoteUser(user)) return;
	if (!user.outbox) {
		logger.debug(`no outbox for ${user.username}@${user.host}`);
		return;
	}

	logger.info(`Updating the outbox: ${user.outbox}`);

	const resolver = new Resolver();

	// Fetch activities from outbox (first page only)
	let unresolvedActivities: (IObject | string)[] | undefined;

	const collection = await resolver.resolveCollection(user.outbox);
	if (!isOrderedCollection(collection)) throw new Error(`Object is not an OrderedCollection`);

	if (collection.orderedItems) {
		unresolvedActivities = collection.orderedItems;
	} else if (collection.first) {
		const page = await resolver.resolveCollection(collection.first);
		if (isOrderedCollectionPage(page)) {
			unresolvedActivities = page.orderedItems;
		}
	}

	if (!unresolvedActivities) throw new Error('Can not fetch outbox items');

	// Process activities
	let itemCount = 0;
	for (const unresolvedActivity of unresolvedActivities) {
		const activity = await resolver.resolve(unresolvedActivity);

		if (isCreate(activity)) {
			const object = await resolver.resolve(activity.object);
			if (isPost(object)) {
				// Note
				if (object.inReplyTo) {
					// skip reply
				} else if (object._misskey_quote || object.quoteUrl) {
					// skip quote
				} else {
					if (++itemCount > 10) break;
					await resolveNote(object, resolver);
				}
			}
		} else {
			// skip Announce etc
		}
	}
}
