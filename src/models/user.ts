import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import rap from '@prezzemolo/rap';
import db from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import { packMany as packNoteMany } from './note';
import Following from './following';
import Blocking from './blocking';
import Mute from './mute';
import { getFriendIds } from '../server/api/common/get-friends';
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

const User = db.get<IUser>('users');

User.createIndex('createdAt');
User.createIndex('updatedAt');
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
	createdAt: Date;
	updatedAt?: Date;
	deletedAt?: Date;
	followersCount: number;
	followingCount: number;
	name?: string;
	notesCount: number;
	username: string;
	usernameLower: string;
	avatarId: mongo.ObjectID;
	bannerId: mongo.ObjectID;
	avatarUrl?: string;
	bannerUrl?: string;
	avatarColor?: any;
	bannerColor?: any;
	wallpaperId: mongo.ObjectID;
	wallpaperUrl?: string;
	data: any;
	description: string;
	pinnedNoteIds: mongo.ObjectID[];
	emojis?: string[];
	tags?: string[];
	profile?: {
		location?: string;
		birthday?: string; // 'YYYY-MM-DD'
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
	 * このアカウントに届いているフォローリクエストの数
	 */
	pendingReceivedFollowRequestsCount: number;

	movedToUserId?: mongo.ObjectID;
	alsoKnownAsUserIds?: mongo.ObjectID[];

	host: string | null;
};

export interface ILocalUser extends IUserBase {
	host: null;
	keypair: string;
	email: string;
	emailVerified?: boolean;
	emailVerifyCode?: string;
	password: string;
	token: string;
	twitter: {
		accessToken: string;
		accessTokenSecret: string;
		userId: string;
		screenName: string;
	};
	github: {
		accessToken: string;
		id: string;
		login: string;
	};
	discord: {
		accessToken: string;
		refreshToken: string;
		expiresDate: number;
		id: string;
		username: string;
		discriminator: string;
	};
	fields?: {
		name: string;
		value: string;
	}[];
	isCat: boolean;
	isAdmin?: boolean;
	isModerator?: boolean;
	isVerified?: boolean;
	refuseFollow?: boolean;
	twoFactorSecret: string;
	twoFactorEnabled: boolean;
	twoFactorTempSecret?: string;
	clientSettings: any;
	settings: {
		autoWatch: boolean;
		alwaysMarkNsfw?: boolean;
	};
	hasUnreadNotification: boolean;
	hasUnreadMessagingMessage: boolean;
}

export interface IRemoteUser extends IUserBase {
	host: string;
	inbox: string;
	sharedInbox?: string;
	outbox?: string;
	featured?: string;
	endpoints: string[];
	uri: string;
	url?: string;
	publicKey: {
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
export function validateUsername(username: string, remote = false): boolean {
	return typeof username == 'string' && (remote ? /^\w([\w.-]*\w)?$/ : /^\w{1,20}$/).test(username);
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
	return typeof birthday == 'string' && /^([0-9]{4})\-([0-9]{2})-([0-9]{2})$/.test(birthday);
}
//#endregion

export async function getMute(muterId: mongo.ObjectId | string, muteeId: mongo.ObjectId | string) {
	return await Mute.findOne({
		muterId: transform(muterId),
		muteeId: transform(muteeId)
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
			muteeId: target
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

/**
 * Pack a user for API response
 *
 * @param user target
 * @param me? serializee
 * @param options? serialize options
 * @return Packed user
 */
export const pack = (
	user: string | mongo.ObjectID | IUser,
	me?: string | mongo.ObjectID | IUser,
	options?: {
		detail?: boolean,
		includeSecrets?: boolean,
		includeHasUnreadNotes?: boolean
	}
) => new Promise<any>(async (resolve, reject) => {
	const opts = Object.assign({
		detail: false,
		includeSecrets: false
	}, options);

	let _user: any;

	const fields = opts.detail ? {} : {
		name: true,
		username: true,
		host: true,
		avatarColor: true,
		avatarId: true,
		bannerId: true,
		emojis: true,
		avoidSearchIndex: true,
		hideFollows: true,
		isCat: true,
		isBot: true,
		isOrganization: true,
		isGroup: true,
		isAdmin: true,
		isVerified: true
	};

	// Populate the user if 'user' is ID
	if (isObjectId(user)) {
		_user = await User.findOne({
			_id: user
		}, { fields });
	} else if (typeof user === 'string') {
		_user = await User.findOne({
			_id: new mongo.ObjectID(user)
		}, { fields });
	} else {
		_user = deepcopy(user);
	}

	// (データベースの欠損などで)ユーザーがデータベース上に見つからなかったとき
	if (_user == null) {
		dbLogger.warn(`user not found on database: ${user}`);
		return resolve(null);
	}

	// Me
	const meId: mongo.ObjectID = me
		? isObjectId(me)
			? me as mongo.ObjectID
			: typeof me === 'string'
				? new mongo.ObjectID(me)
				: (me as IUser)._id
		: null;

	// Rename _id to id
	_user.id = _user._id;
	delete _user._id;

	_user.movedToUser = _user.movedToUserId ? pack(_user.movedToUserId) : null;

	delete _user.usernameLower;
	delete _user.emailVerifyCode;

	delete _user.lang;	// 廃止のため

	if (_user.host == null) {
		// Remove private properties
		delete _user.keypair;
		delete _user.password;
		delete _user.token;
		delete _user.twoFactorTempSecret;
		delete _user.two_factor_temp_secret; // 後方互換性のため
		delete _user.twoFactorSecret;
		if (_user.twitter) {
			delete _user.twitter.accessToken;
			delete _user.twitter.accessTokenSecret;
		}
		if (_user.github) {
			delete _user.github.accessToken;
		}
		if (_user.discord) {
			delete _user.discord.accessToken;
			delete _user.discord.refreshToken;
			delete _user.discord.expiresDate;
		}

		// Visible via only the official client
		if (!opts.includeSecrets) {
			delete _user.email;
			delete _user.emailVerified;
			delete _user.settings;
			delete _user.clientSettings;
		}

		if (!opts.detail) {
			delete _user.twoFactorEnabled;
		}
	} else {
		delete _user.publicKey;
	}

	_user.avatarUrl = DriveFile.findOne({
		_id: _user.avatarId
	}).then(file => getDriveFileUrl(file, true, false) || `${config.driveUrl}/default-avatar.jpg`);

	_user.bannerUrl = DriveFile.findOne({
		_id: _user.bannerId
	}).then(file => getDriveFileUrl(file, false, false) || undefined);

	if (!meId || !meId.equals(_user.id) || !opts.detail) {
		delete _user.avatarId;
		delete _user.bannerId;
		delete _user.hasUnreadMessagingMessage;
		delete _user.hasUnreadNotification;
	}

	if (meId && !meId.equals(_user.id) && opts.detail) {
		const relation = await getRelation(meId, _user.id);

		_user.isFollowing = relation.isFollowing;
		_user.isFollowed = relation.isFollowed;
		_user.hasPendingFollowRequestFromYou = relation.hasPendingFollowRequestFromYou;
		_user.hasPendingFollowRequestToYou = relation.hasPendingFollowRequestToYou;
		_user.isBlocking = relation.isBlocking;
		_user.isBlocked = relation.isBlocked;
		_user.isMuted = relation.isMuted;
		_user.isHideRenoting = relation.isHideRenoting;
	}

	if (opts.detail) {
		if (_user.pinnedNoteIds) {
			// Populate pinned notes
			_user.pinnedNotes = packNoteMany(_user.pinnedNoteIds, meId, {
				removeError: true,
				detail: true
			});
		}

		if (meId) {
			const usertag = await Usertag.findOne({
				ownerId: meId,
				targetId: _user.id
			});

			_user.usertags = usertag?.tags || [];
		}

		if (meId && !meId.equals(_user.id)) {
			const myFollowingIds = await getFriendIds(meId);

			// Get following you know count
			_user.followingYouKnowCount = Following.count({
				followeeId: { $in: myFollowingIds },
				followerId: _user.id
			});

			// Get followers you know count
			_user.followersYouKnowCount = Following.count({
				followeeId: _user.id,
				followerId: { $in: myFollowingIds }
			});
		}
	}

	if (!opts.includeHasUnreadNotes) {
		delete _user.hasUnreadSpecifiedNotes;
		delete _user.hasUnreadMentions;
	}

	const fetchInstance = async () => {
		if (_user.host == null) return null;

		const info = {
			host: null as unknown,
			name: null as unknown,
			softwareName: null as unknown,
			softwareVersion: null as unknown,
			iconUrl: null as unknown,
		};

		const instance = await registerOrFetchInstanceDoc(_user.host);
		info.host = toApHost(_user.host);
		info.name = instance?.name || null;
		info.softwareName = instance?.softwareName || null;
		info.softwareVersion = instance?.softwareVersion || null;
		info.iconUrl = instance?.iconUrl || null;
		return info;
	};

	_user.instance = fetchInstance();

	// カスタム絵文字添付
	if (_user.emojis) {
		_user.emojis = packEmojis(_user.emojis, _user.host).catch(e => {
			console.warn(e);
			return [];
		});
	}

	// resolve promises in _user object
	_user = await rap(_user);

	resolve(_user);
});

/*
function img(url) {
	return {
		thumbnail: {
			large: `${url}`,
			medium: '',
			small: ''
		}
	};
}
*/

export async function fetchProxyAccount(): Promise<ILocalUser> {
	const meta = await fetchMeta();
	return await User.findOne({ username: meta.proxyAccount, host: null }) as ILocalUser;
}
