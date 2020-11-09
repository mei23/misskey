import * as mongo from 'mongodb';
import * as promiseLimit from 'promise-limit';
import { toUnicode } from 'punycode';

import config from '../../../config';
import User, { validateUsername, IUser, IRemoteUser, isRemoteUser } from '../../../models/user';
import Resolver from '../resolver';
import { resolveImage } from './image';
import { isCollectionOrOrderedCollection, isCollection, isOrderedCollection, IObject, isActor, IApPerson, isPropertyValue, IApPropertyValue, ApObject, getApIds, getOneApHrefNullable, isOrderedCollectionPage, isCreate, isPost } from '../type';
import { IDriveFile } from '../../../models/drive-file';
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
const logger = apLogger;

/**
 * Validate and convert to actor object
 * @param x Fetched object
 * @param uri Fetch target URI
 */
function toPerson(x: IObject, uri: string): IApPerson {
	const expectHost = toUnicode(new URL(uri).hostname.toLowerCase());

	if (x == null) {
		throw new Error('invalid person: object is null');
	}

	if (!isActor(x)) {
		throw new Error(`invalid person type '${x.type}'`);
	}

	if (typeof x.preferredUsername !== 'string') {
		throw new Error('invalid person: preferredUsername is not a string');
	}

	if (typeof x.inbox !== 'string') {
		throw new Error('invalid person: inbox is not a string');
	}

	if (!validateUsername(x.preferredUsername, true)) {
		throw new Error('invalid person: invalid username');
	}

	if (typeof x.id !== 'string') {
		throw new Error('invalid person: id is not a string');
	}

	const idHost = toUnicode(new URL(x.id).hostname.toLowerCase());
	if (idHost !== expectHost) {
		throw new Error('invalid person: id has different host');
	}

	if (typeof x.publicKey.id !== 'string') {
		throw new Error('invalid person: publicKey.id is not a string');
	}

	const publicKeyIdHost = toUnicode(new URL(x.publicKey.id).hostname.toLowerCase());
	if (publicKeyIdHost !== expectHost) {
		throw new Error('invalid person: publicKey.id has different host');
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
export async function createPerson(uri: string, resolver?: Resolver): Promise<IUser> {
	if (typeof uri !== 'string') throw 'uri is not string';

	if (resolver == null) resolver = new Resolver();

	const object = await resolver.resolve(uri);

	const person = toPerson(object, uri);

	logger.info(`Creating the Person: ${person.id}`);

	const [followersCount = 0, followingCount = 0, notesCount = 0] = await Promise.all([
		resolver.resolve(person.followers).then(
			resolved => isCollectionOrOrderedCollection(resolved) ? resolved.totalItems : undefined,
			() => undefined
		),
		resolver.resolve(person.following).then(
			resolved => isCollectionOrOrderedCollection(resolved) ? resolved.totalItems : undefined,
			() => undefined
		),
		resolver.resolve(person.outbox).then(
			resolved => isCollectionOrOrderedCollection(resolved) ? resolved.totalItems : undefined,
			() => undefined
		)
	]);

	const host = toUnicode(new URL(object.id).hostname.toLowerCase());

	const { fields, services } = analyzeAttachments(person.attachment);

	const tags = extractApHashtags(person.tag).map(tag => tag.toLowerCase()).splice(0, 64);

	const movedToUserId = await resolveAnotherUser(uri, person.movedTo);
	// const alsoKnownAsUserIds = await resolveAnotherUsers(uri, person.alsoKnownAs);
	const alsoKnownAsUserIds: mongo.ObjectID[] = [];

	const bday = person['vcard:bday']?.match(/^\d{4}-\d{2}-\d{2}/);

	// Create user
	let user: IRemoteUser | undefined;
	try {
		user = await User.insert({
			avatarId: null,
			bannerId: null,
			createdAt: new Date(),
			lastFetchedAt: new Date(),
			description: htmlToMfm(person.summary, person.tag),
			followersCount,
			followingCount,
			notesCount,
			name: person.name,
			isLocked: person.manuallyApprovesFollowers,
			username: person.preferredUsername,
			usernameLower: person.preferredUsername.toLowerCase(),
			host,
			publicKey: {
				id: person.publicKey.id,
				publicKeyPem: person.publicKey.publicKeyPem
			},
			inbox: person.inbox,
			sharedInbox: person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined),
			outbox: person.outbox,
			featured: person.featured,
			endpoints: person.endpoints,
			uri: person.id,
			movedToUserId,
			alsoKnownAsUserIds,
			url: getOneApHrefNullable(person.url),
			fields,
			...services,
			tags,
			profile: {
				birthday: bday ? bday[0] : undefined,
				location: person['vcard:Address'] || undefined,
			},
			isBot: object.type == 'Service',
			isGroup: object.type == 'Group',
			isOrganization: object.type == 'Organization',
			isCat: (person as any).isCat === true
		}) as IRemoteUser;
	} catch (e) {
		// duplicate key error
		if (e.code === 11000) {
			user = await User.findOne({
				uri: person.id
			});

			// 同じ@username@host を持つものがあった場合、被った先を返す
			if (user == null) {
				const u = await User.findOne({
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
			}
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
	const [avatar, banner] = (await Promise.all<IDriveFile>([
		toSingle(person.icon),
		toSingle(person.image)
	].map(img =>
		img == null
			? Promise.resolve(null)
			: resolveImage(user, img).catch(() => null)
	)));

	const avatarId = avatar ? avatar._id : null;
	const bannerId = banner ? banner._id : null;
	const avatarUrl = getDriveFileUrl(avatar, true);
	const bannerUrl = getDriveFileUrl(banner, false);
	const avatarColor = avatar && avatar.metadata.properties.avgColor ? avatar.metadata.properties.avgColor : null;
	const bannerColor = banner && avatar.metadata.properties.avgColor ? banner.metadata.properties.avgColor : null;

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
	const emojis = await extractEmojis(person.tag, host).catch(e => {
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
export async function updatePerson(uri: string, resolver?: Resolver, hint?: IApPerson): Promise<void> {
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

	const person = toPerson(object, uri);

	logger.info(`Updating the Person: ${person.id}`);

	const [followersCount = 0, followingCount = 0, notesCount = 0] = await Promise.all([
		resolver.resolve(person.followers).then(
			resolved => isCollectionOrOrderedCollection(resolved) ? resolved.totalItems : undefined,
			() => undefined
		),
		resolver.resolve(person.following).then(
			resolved => isCollectionOrOrderedCollection(resolved) ? resolved.totalItems : undefined,
			() => undefined
		),
		resolver.resolve(person.outbox).then(
			resolved => isCollectionOrOrderedCollection(resolved) ? resolved.totalItems : undefined,
			() => undefined
		)
	]);

	// アイコンとヘッダー画像をフェッチ
	const [avatar, banner] = (await Promise.all<IDriveFile>([
		toSingle(person.icon),
		toSingle(person.image)
	].map(img =>
		img == null
			? Promise.resolve(null)
			: resolveImage(exist, img).catch(() => null)
	)));

	// カスタム絵文字取得
	const emojis = await extractEmojis(person.tag, exist.host).catch(e => {
		logger.info(`extractEmojis: ${e}`);
		return [] as IEmoji[];
	});

	const emojiNames = emojis.map(emoji => emoji.name);

	const { fields, services } = analyzeAttachments(person.attachment);

	const tags = extractApHashtags(person.tag).map(tag => tag.toLowerCase()).splice(0, 64);

	const movedToUserId = await resolveAnotherUser(uri, person.movedTo);
	const alsoKnownAsUserIds = await resolveAnotherUsers(uri, person.alsoKnownAs);

	const bday = person['vcard:bday']?.match(/^\d{4}-\d{2}-\d{2}/);

	const updates = {
		lastFetchedAt: new Date(),
		inbox: person.inbox,
		sharedInbox: person.sharedInbox || (person.endpoints ? person.endpoints.sharedInbox : undefined),
		outbox: person.outbox,
		featured: person.featured,
		emojis: emojiNames,
		description: htmlToMfm(person.summary, person.tag),
		followersCount,
		followingCount,
		notesCount,
		name: person.name,
		movedToUserId,
		alsoKnownAsUserIds,
		url: getOneApHrefNullable(person.url),
		endpoints: person.endpoints,
		fields,
		...services,
		tags,
		profile: {
			birthday: bday ? bday[0] : undefined,
			location: person['vcard:Address'] || undefined,
		},
		isBot: object.type == 'Service',
		isGroup: object.type == 'Group',
		isOrganization: object.type == 'Organization',
		isCat: (person as any).isCat === true,
		isLocked: person.manuallyApprovesFollowers,
		publicKey: {
			id: person.publicKey.id,
			publicKeyPem: person.publicKey.publicKeyPem
		},
	} as any;

	if (avatar) {
		updates.avatarId = avatar._id;
		updates.avatarUrl = getDriveFileUrl(avatar, true);
		updates.avatarColor = avatar.metadata.properties.avgColor ? avatar.metadata.properties.avgColor : null;
	}

	if (banner) {
		updates.bannerId = banner._id;
		updates.bannerUrl = getDriveFileUrl(banner, true);
		updates.bannerColor = banner.metadata.properties.avgColor ? banner.metadata.properties.avgColor : null;
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
export async function resolvePerson(uri: string, verifier?: string, resolver?: Resolver): Promise<IUser> {
	if (typeof uri !== 'string') throw 'uri is not string';

	//#region このサーバーに既に登録されていたらそれを返す
	const exist = await fetchPerson(uri);

	if (exist) {
		return exist;
	}
	//#endregion

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
				value: fromHtml(attachment.value)
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
		.filter(item => item.type === 'Note')
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
	let unresolvedActivities: (IObject | string)[];

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

async function resolveAnotherUser(selfUri: string, ids: ApObject | undefined) {
	const users = await resolveAnotherUsers(selfUri, ids);
	return users.length > 0 ? users[0] : undefined;
}

async function resolveAnotherUsers(selfUri: string, ids: ApObject | undefined) {
	const users = await Promise.all(
		getApIds(ids).map(uri => resolvePerson(uri).catch(() => null))
	) as IRemoteUser[];

	return users.filter(x => x != null && x.uri != selfUri).map(x => x._id);
}
