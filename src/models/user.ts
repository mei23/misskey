// tslint:disable: use-type-alias
import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import { packMany as packNoteMany } from './note';
import Following from './following';
import Blocking from './blocking';
import Mute from './mute';
import config from '../config';
import FollowRequest from './follow-request';
import fetchMeta from '../misc/fetch-meta';
import { packEmojis } from '../misc/pack-emojis';
import { dbLogger } from '../db/logger';
import DriveFile from './drive-file';
import getDriveFileUrl from '../misc/get-drive-file-url';
import UserFilter from './user-filter';
import { transform } from '../misc/cafy-id';
import Usertag from './usertag';
import { registerOrFetchInstanceDoc } from '../services/register-or-fetch-instance-doc';
import { toApHost } from '../misc/convert-host';
import { awaitAll } from '../prelude/await-all';
import { oidEquals } from '../prelude/oid';
import { PackedUser, PackedNote } from './packed-schemas';
import { toISODateOrNull, toOidString, toOidStringOrNull } from '../misc/pack-utils';

const User = db.get<IUser>('users');

User.createIndex('createdAt');
User.createIndex('updatedAt');
User.createIndex('lastActivityAt');
User.createIndex('followersCount');
User.createIndex('tags');
User.createIndex('isSuspended');
User.createIndex('username');
User.createIndex('usernameLower');
User.createIndex('host');
User.createIndex(['username', 'host'], { unique: true });
User.createIndex(['usernameLower', 'host'], { unique: true });
User.createIndex('token', { sparse: true, unique: true });
User.createIndex('uri', { sparse: true, unique: true });

export default User;

type IUserBase = {
	_id: mongo.ObjectID;
	createdAt?: Date;
	updatedAt?: Date;
	lastActivityAt?: Date;
	followersCount: number;
	followingCount: number;
	name?: string | null;
	notesCount: number;
	username: string;
	usernameLower: string;
	avatarId?: mongo.ObjectID | null;
	bannerId?: mongo.ObjectID | null;
	avatarUrl?: string | null;
	bannerUrl?: string | null;
	avatarColor?: any;
	bannerColor?: any;
	wallpaperId: mongo.ObjectID;
	wallpaperUrl?: string;
	data: any;
	description?: string | null;
	pinnedNoteIds: mongo.ObjectID[];
	emojis?: string[];
	tags?: string[];
	profile?: {
		location?: string | null;
		birthday?: string | null; // 'YYYY-MM-DD'
		tags?: string[];
	};

	isDeleted: boolean;

	/**
	 * 凍結されているか否か
	 */
	isSuspended: boolean;

	/**
	 * サイレンスされているか否か
	 */
	isSilenced: boolean;

	/**
	 * 鍵アカウントか否か
	 */
	isLocked: boolean;

	/**
	 * Botか否か
	 */
	isBot: boolean;

	isCat: boolean;

	isOrganization?: boolean;
	isGroup?: boolean;

	/**
	 * Botからのフォローを承認制にするか
	 */
	carefulBot: boolean;

	/**
	 * リモートからのフォローを承認制にするか
	 */
	carefulRemote: boolean;

	/**
	 * 大量フォローユーザーのフォローを承認制にするか
	 */
	carefulMassive?: boolean;

	/**
	 * フォローしているユーザーからのフォローリクエストを自動承認するか
	 */
	autoAcceptFollowed: boolean;

	/**
	 * 検索エンジンのインデックスを拒否するか
	 */
	avoidSearchIndex?: boolean;

	/**
	 * フォローフォロー一覧を隠すか
	 */
	hideFollows?: '' | 'follower' | 'always';

	/**
	 * 連合を無効にするか
	 */
	noFederation?: boolean;

	/**
	 * みつけるに表示するか
	 */
	isExplorable?: boolean;

	/**
	 * このアカウントに届いているフォローリクエストの数
	 */
	pendingReceivedFollowRequestsCount: number;

	movedToUserId?: mongo.ObjectID;
	alsoKnownAsUserIds?: mongo.ObjectID[];

	host: string | null;

	fields?: {
		name: string,
		value: string
	}[];
};

export interface ILocalUser extends IUserBase {
	host: null;
	/** privateKeyPem */
	keypair: string;
	email: string;
	emailVerified?: boolean;
	emailVerifyCode?: string;
	password: string;
	token: string;
	twitter?: {
		accessToken: string;
		accessTokenSecret: string;
		userId: string;
		screenName: string;
	};
	github?: {
		accessToken: string;
		id: string;
		login: string;
	};
	discord?: {
		accessToken: string;
		refreshToken: string;
		expiresDate: number;
		id: string;
		username: string;
		discriminator: string;
	};
	isAdmin?: boolean;
	isModerator?: boolean;
	isVerified?: boolean;
	refuseFollow?: boolean;
	twoFactorSecret: string;
	twoFactorEnabled: boolean;
	twoFactorTempSecret?: string;
	clientSettings: any;
	settings?: {
		autoWatch: boolean;
		alwaysMarkNsfw?: boolean;
		pushNotifications?: Record<string, boolean | undefined>;
	};
	hasUnreadNotification: boolean;
	hasUnreadMessagingMessage: boolean;
	hasUnreadSpecifiedNotes?: boolean;
	hasUnreadMentions?: boolean;
}

export function getPushNotificationsValue(pushNotifications: Record<string, boolean | undefined> | undefined, key: string) {
	if (pushNotifications == null) return true;
	const value = pushNotifications[key];
	if (value == null) return true;
	return value;
}

export interface IRemoteUser extends IUserBase {
	host: string;
	inbox: string;
	sharedInbox?: string;
	outbox?: string;
	featured?: string;
	endpoints?: string[];
	uri: string;
	url?: string;
	publicKey?: {
		id: string;
		publicKeyPem: string;
	};
	lastFetchedAt: Date;
	isAdmin: false;
	isModerator: false;
}

export type IUser = ILocalUser | IRemoteUser;

export const isLocalUser = (user: any): user is ILocalUser =>
	user.host === null;

export const isRemoteUser = (user: any): user is IRemoteUser =>
	!isLocalUser(user);

//#region Validators
export function validateUsername(username: string): boolean {
	return typeof username == 'string' && (/^\w{1,20}$/).test(username);
}

export function validatePassword(password: string): boolean {
	return typeof password == 'string' && password != '';
}

export function isValidName(name?: string): boolean {
	return name === null || (typeof name == 'string' && name.length < 50 && name.trim() != '');
}

export function isValidDescription(description: string): boolean {
	return typeof description == 'string' && description.length < 500 && description.trim() != '';
}

export function isValidLocation(location: string): boolean {
	return typeof location == 'string' && location.length < 50 && location.trim() != '';
}

export function isValidBirthday(birthday: string): boolean {
	// eslint-disable-next-line no-useless-escape
	return typeof birthday == 'string' && /^([0-9]{4,8})\-([0-9]{2})-([0-9]{2})$/.test(birthday);
}
//#endregion

export async function getMute(muterId: mongo.ObjectId | string, muteeId: mongo.ObjectId | string) {
	return await Mute.findOne({
		muterId: transform(muterId),
		muteeId: transform(muteeId),
		$or: [
			{ expiresAt: null },
			{ expiresAt: { $lt: new Date() }}
		]
	});
}

export async function getRelation(me: mongo.ObjectId, target: mongo.ObjectId) {
	const [following, followed, followReqFromYou, followReqToYou, blocking, blocked, muted, filter] = await Promise.all([
		Following.count({
			followerId: me,
			followeeId: target
		}),
		Following.count({
			followerId: target,
			followeeId: me
		}),
		FollowRequest.count({
			followerId: me,
			followeeId: target
		}),
		FollowRequest.count({
			followerId: target,
			followeeId: me
		}),
		Blocking.count({
			blockerId: me,
			blockeeId: target
		}),
		Blocking.count({
			blockerId: target,
			blockeeId: me
		}),
		Mute.count({
			muterId: me,
			muteeId: target,
			$or: [
				{ expiresAt: null },
				{ expiresAt: { $gt: new Date() }}
			]
		}),
		UserFilter.findOne({
			ownerId: me,
			targetId: target
		})
	]);

	return {
		id: target,
		isFollowing: following > 0,
		isFollowed: followed > 0,
		hasPendingFollowRequestFromYou: followReqFromYou > 0,
		hasPendingFollowRequestToYou: followReqToYou > 0,
		isBlocking: blocking > 0,
		isBlocked: blocked > 0,
		isMuted: muted > 0,
		isHideRenoting: !!(filter?.hideRenote),
	};
}

type PackOptions = {
	detail?: boolean,
	includeSecrets?: boolean,
	includeHasUnreadNotes?: boolean
};

export async function pack(
	src: IUser,
	me?: string | mongo.ObjectID | IUser | null,
	options?: PackOptions
): Promise<PackedUser>;
export async function pack(
	src: string | mongo.ObjectID,
	me?: string | mongo.ObjectID | IUser | null,
	options?: PackOptions
): Promise<PackedUser | null>;
/**
 * Pack a user for API response
 *
 * @param user target
 * @param me? serializee
 * @param options? serialize options
 * @return Packed user
 */
export async function pack(
	src: string | mongo.ObjectID | IUser,
	me?: string | mongo.ObjectID | IUser | null,
	options?: PackOptions
): Promise<PackedUser | null> {
	const opts = Object.assign({
		detail: false,
		includeSecrets: false
	}, options);

	let db: IUser | undefined;

	// Populate the user if 'user' is ID
	if (isObjectId(src)) {
		db = await User.findOne({
			_id: src
		});
	} else if (typeof src === 'string') {
		db = await User.findOne({
			_id: new mongo.ObjectID(src)
		});
	} else {
		db = deepcopy(src);
	}

	// (データベースの欠損などで)ユーザーがデータベース上に見つからなかったとき
	if (db == null) {
		dbLogger.warn(`user not found on database: ${src}`);
		return null;
	}

	// Me
	const meId: mongo.ObjectID | null = me
		? isObjectId(me)
			? me as mongo.ObjectID
			: typeof me === 'string'
				? new mongo.ObjectID(me)
				: (me as IUser)._id
		: null;

		const fetchInstance = async () => {
		if (db!.host == null) return null;

		const info = {
			host: null as unknown,
			name: null as unknown,
			softwareName: null as unknown,
			softwareVersion: null as unknown,
			iconUrl: null as unknown,
			themeColor: null as unknown,
		};

		const instance = await registerOrFetchInstanceDoc(db!.host);
		info.host = toApHost(db!.host);
		info.name = instance?.name || null;
		info.softwareName = instance?.softwareName || null;
		info.softwareVersion = instance?.softwareVersion || null;
		info.iconUrl = instance?.iconUrl || null;
		info.themeColor = instance?.themeColor || null;
		return info;
	};

	const relation = (meId && !oidEquals(meId, db._id) && opts.detail) ? await getRelation(meId, db._id) : null;	// TODO

	const populateUserTags = async () => {
		if (!meId) return undefined;

		const usertag =await Usertag.findOne({
			ownerId: meId,
			targetId: db!._id
		});

		return usertag?.tags || [];
	};

	const packed: PackedUser = await awaitAll({
		id: toOidString(db._id),
		username: db.username,
		name: db.name || null,
		host: db.host,

		avatarUrl: db.avatarId ? DriveFile.findOne({
			_id: db.avatarId
		}).then(file => getDriveFileUrl(file, true) || `${config.driveUrl}/default-avatar.jpg`) : `${config.driveUrl}/default-avatar.jpg`,
		avatarColor: null, // 後方互換性のため

		isAdmin: !!db.isAdmin,
		isBot: !!db.isBot,
		isCat: !!db.isCat,

		instance: fetchInstance(),

		// カスタム絵文字添付
		emojis: db.emojis ? packEmojis(db.emojis, db.host).catch(e => {
			console.warn(e);
			return [];
		}): [],

		avoidSearchIndex: !!db.avoidSearchIndex,

		...(opts.detail ? {
			createdAt: toISODateOrNull(db.createdAt),
			updatedAt: toISODateOrNull(db.updatedAt),
			bannerUrl: db.bannerUrl ? DriveFile.findOne({
				_id: db.bannerId
			}).then(file => getDriveFileUrl(file, false) || null) : null,
			bannerColor: null, // 後方互換性のため
			isLocked: !!db.isLocked,

			isSilenced: !!db.isSilenced,
			isSuspended: !!db.isSuspended,
			isDeleted: !!db.isDeleted,
			description: db.description || null,
			profile: {
				birthday: db.profile?.birthday || null,
				location: db.profile?.location || null,
			},
			tags: db.tags || [],
			fields: db.fields || [],
			followersCount: db.followersCount,
			followingCount: db.followingCount,
			notesCount: db.notesCount,
			pinnedNoteIds: db.pinnedNoteIds ? db.pinnedNoteIds.map(toOidString) : [],
			pinnedNotes: packNoteMany(db.pinnedNoteIds || [], meId, {
				removeError: true,
				detail: true
			}) as Promise<PackedNote[]>,
			movedToUser: db.movedToUserId ? pack(db.movedToUserId) : null,
			usertags: populateUserTags(),

			...(isLocalUser(db) ? {
				isVerified: !!db.isVerified,
				isModerator: !!db.isModerator,
				twoFactorEnabled: !!db.twoFactorEnabled,

				twitter: db.twitter ? {
					screenName: db.twitter?.screenName,
					userId: db.twitter?.userId
				} : undefined,
				github: db.github ? {
					id: db.github?.id,
					login: db.github?.login
				} : undefined,
				discord: db.discord ? {
					id: db.discord?.id,
					username: db.discord?.username,
					discriminator: db.discord?.discriminator,
				} : undefined,
			}: {}),

			...(isRemoteUser(db) ? {
				url: db.url || null,
				uri: db.uri || null,
			}: {}),

		} : {}),

		// detail && 自分を見てる
		...((opts.detail && meId && oidEquals(meId, db._id) && isLocalUser(db)) ? {
			avatarId: toOidStringOrNull(db.avatarId),
			bannerId: toOidStringOrNull(db.bannerId),
			alwaysMarkNsfw: !!db.settings?.alwaysMarkNsfw,
			carefulBot: !!db.carefulBot,
			carefulRemote: !!db.carefulRemote,
			carefulMassive: !!db.carefulMassive,
			refuseFollow: !!db.refuseFollow,
			autoAcceptFollowed: !!db.autoAcceptFollowed,
			isExplorable: !!db.isExplorable,
			hideFollows: db.hideFollows || '',

			wallpaperId: toOidStringOrNull(db.wallpaperId),
			wallpaperUrl: db.wallpaperUrl || null,

			hasUnreadMessagingMessage: !!db.hasUnreadMessagingMessage,
			hasUnreadNotification: !!db.hasUnreadNotification,
			hasUnreadSpecifiedNotes: !!db.hasUnreadSpecifiedNotes,
			hasUnreadMentions: !!db.hasUnreadMentions,
			pendingReceivedFollowRequestsCount: db.pendingReceivedFollowRequestsCount || 0,
		} : {}),

		// includeSecrets && 自分を見てる
		...((opts.includeSecrets && meId && oidEquals(meId, db._id) && isLocalUser(db)) ? {
			email: db.email || null,
			emailVerified: !!db.emailVerified,
			clientSettings: db.clientSettings,
			settings: db.settings,
		} : {}),

		// 他人を見てる
		...(relation ? {
			isFollowing: relation.isFollowing,
			isFollowed: relation.isFollowed,
			hasPendingFollowRequestFromYou: relation.hasPendingFollowRequestFromYou,
			hasPendingFollowRequestToYou: relation.hasPendingFollowRequestToYou,
			isBlocking: relation.isBlocking,
			isBlocked: relation.isBlocked,
			isMuted: relation.isMuted,
			isHideRenoting: relation.isHideRenoting,
		} : {}),
	});

	return packed;
}

export async function fetchProxyAccount(): Promise<ILocalUser> {
	const meta = await fetchMeta();
	return await User.findOne({ username: meta.proxyAccount, host: null }) as ILocalUser;
}
