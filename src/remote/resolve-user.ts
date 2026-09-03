import { toUnicode, toASCII } from 'punycode/';
import User, { IUser, IRemoteUser } from '../models/user';
import webFinger from './webfinger';
import config from '../config';
import { createPerson, updatePerson } from './activitypub/models/person';
import { URL } from 'url';
import { remoteLogger } from './logger';
import { toDbHost } from '../misc/convert-host';

const logger = remoteLogger.createSubLogger('resolve-user');

export default async (username: string, _host: string | null, option?: any, resync = false): Promise<IUser | undefined | null> => {
	const usernameLower = username.toLowerCase();

	if (_host == null) {
		logger.info(`return local user: ${usernameLower}`);
		return await User.findOne({ usernameLower, host: null });
	}

	// disableFederationならリモート解決しない
	if (config.disableFederation) return null;

	const configHostAscii = toASCII(config.host).toLowerCase();
	const configHost = toUnicode(configHostAscii);

	const hostAscii = toASCII(_host).toLowerCase();
	const host = toUnicode(hostAscii);

	if (configHost == host) {
		logger.info(`return local user: ${usernameLower}`);
		return await User.findOne({ usernameLower, host: null });
	}

	let user = await User.findOne({ usernameLower, host }, option) as IRemoteUser;
	if (user == null) {
		user = await User.findOne({ 
			usernameLower,
			canonicalHost: host, 
		}, option) as IRemoteUser;
	}

	const acct = new Acct(username, hostAscii);

	if (user == null) {
		const self = await resolveSelf(acct);

		logger.succ(`return new remote user: ${acct}`);
		return await createPerson(self.href);
	}

	// resyncオプション OR ユーザー情報が古い場合は、WebFilgerからやりなおして返す
	if (resync || user.lastFetchedAt == null || Date.now() - user.lastFetchedAt.getTime() > 1000 * 60 * 60 * 24) {
		// 繋がらないインスタンスに何回も試行するのを防ぐ, 後続の同様処理の連続試行を防ぐ ため 試行前にも更新する
		await User.update({ _id: user._id }, {
			$set: {
				lastFetchedAt: new Date(),
			},
		});

		try {
			logger.info(`try resync: ${acct}`);
			const self = await resolveSelf(acct);

			if (user.uri !== self.href) {
				// if uri mismatch, Fix (user@host <=> AP's Person id(IRemoteUser.uri)) mapping.
				logger.info(`uri missmatch: ${acct}`);
				logger.info(`recovery missmatch uri for (username=${username}, host=${host}) from ${user.uri} to ${self.href}`);

				// validate uri
				const uri = new URL(self.href);
				if (uri.hostname !== hostAscii) {
					throw new Error(`Invalid uri`);
				}

				await User.update({
					usernameLower,
					host: host
				}, {
					$set: {
						uri: self.href
					}
				});
			} else {
				logger.info(`uri is fine: ${acct}`);
			}

			await updatePerson(self.href);

			logger.info(`return resynced remote user: ${acct}`);
			return await User.findOne({ uri: self.href });
		} catch (e: any) {
			logger.warn(`resync failed: ${e.message || e}`);
		}
	}

	logger.info(`return existing remote user: ${acct}`);
	return user;
};

async function resolveSelf(acct: Acct) {
	const f1 = await resolveWebFinger(acct);
	logger.debug(`WebFinger1: ${JSON.stringify(f1)}`);

	if (f1.acct.isEqual(acct)) {
		return f1.self;
	}

	const f2 = await resolveWebFinger(f1.acct);
	logger.debug(`WebFinger2: ${JSON.stringify(f2)}`);

	if (f2.acct.isEqual(f1.acct) && f1.self.href === f2.self.href) {
		return f2.self;
	}

	logger.error(`Failed to WebFinger for ${acct}: subject missmatch`);
	throw new Error(`Failed to WebFinger for ${acct}: subject missmatch`);
}

export async function resolveWebFinger(query: string | Acct) {
	logger.info(`WebFinger for ${query}`);
	const finger = await webFinger(query).catch(e => {
		logger.error(`Failed to WebFinger for ${query}: ${ e.statusCode || e.message }`);
		throw new Error(`Failed to WebFinger for ${query}: ${ e.statusCode || e.message }`);
	});

	const self = finger.links.find(link => link.rel && link.rel.toLowerCase() === 'self');
	if (!self) {
		logger.error(`Failed to WebFinger for ${query}: self link not found`);
		throw new Error('self link not found');
	}

	const subject = finger.subject;
	if (!subject) {
		logger.error(`Failed to WebFinger for ${query}: subject not found`);
		throw new Error('subject not found');
	}

	return { subject, self, acct: Acct.fromString(subject) };
}

export async function checkCanonical(uri: string) {
	// 普通にURIでWebFinger
	const f1 = await resolveWebFinger(uri);
	logger.debug(`WebFinger1: ${JSON.stringify(f1)}`);

	// URIのホストと…
	const queryHost = new URL(uri).host;

	// WebFinger応答のsubjectにあるacctの…
	// ホストは…
	// 一致してる？
	if (queryHost === f1.acct.host) {
		return;
	}

	// してなければ、応答で指定されていたホストに再度WebFinger
	const f2 = await resolveWebFinger(f1.acct);
	logger.debug(`WebFinger2: ${JSON.stringify(f2)}`);

	if (f1.acct.host === f2.acct.host) {
		// canonicalHostを保存しておく
		await User.update({ uri }, {
			$set: {
				canonicalHost: toDbHost(f2.acct.host)
			}
		});

		return;
	}

	throw new Error('checkCanonical failed');
}

export class Acct {
	public username: string;
	public host: string;

	constructor(username: string, host: string) {
		this.username = username;
		this.host = host.toLowerCase();
	}

	static fromStrings(username: string, host: string): Acct {
		return new Acct(username, host);
	}

	static fromString(acctString: string): Acct {
		const regex = /^(?:acct:)?@?([^@]+)@([^@]+)$/;
		const match = acctString.match(regex);
		if (!match) {
			throw new Error('Invalid acct string format');
		}
		return new Acct(match[1], match[2]);
	}

	toString(): string {
		return `acct:${this.username}@${this.host}`;
	}

	isEqual(other: Acct): boolean {
		return this.username.toLowerCase() === other.username.toLowerCase() &&
					 this.host.toLowerCase() === other.host.toLowerCase();
	}
}
