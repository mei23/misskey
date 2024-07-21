import { toUnicode, toASCII } from 'punycode/';
import User, { IUser, IRemoteUser } from '../models/user';
import webFinger from './webfinger';
import config from '../config';
import { createPerson, updatePerson } from './activitypub/models/person';
import { URL } from 'url';
import { remoteLogger } from './logger';
import { toDbHost } from '../misc/convert-host';

const logger = remoteLogger.createSubLogger('resolve-user');

export default async (username: string, _host: string | null, option?: any, resync = true): Promise<IUser | undefined | null> => {
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

	const acctLower = `${usernameLower}@${hostAscii}`;

	if (user == null) {
		const self = await resolveSelf(acctLower);

		logger.succ(`return new remote user: ${acctLower}`);
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
			logger.info(`try resync: ${acctLower}`);
			const self = await resolveSelf(acctLower);

			if (user.uri !== self.href) {
				// if uri mismatch, Fix (user@host <=> AP's Person id(IRemoteUser.uri)) mapping.
				logger.info(`uri missmatch: ${acctLower}`);
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
				logger.info(`uri is fine: ${acctLower}`);
			}

			await updatePerson(self.href);

			logger.info(`return resynced remote user: ${acctLower}`);
			return await User.findOne({ uri: self.href });
		} catch (e: any) {
			logger.warn(`resync failed: ${e.message || e}`);
		}
	}

	logger.info(`return existing remote user: ${acctLower}`);
	return user;
};

async function resolveSelf(acctLower: string) {	// acctLower or uri
	const f1 = await resolveWebFinger(acctLower);
	logger.debug(`WebFinger1: ${JSON.stringify(f1)}`);

	if (f1.subject.toLowerCase() === `acct:${acctLower}`) {
		return f1.self;
	}

	// retry with given subject
	const m = f1.subject.toLowerCase().match(/^acct:([^@]+)@(.*)$/);
	if (!m) {
		logger.error(`Failed to WebFinger for ${acctLower}: invalid subject ${f1.subject}`);
		throw new Error(`Failed to WebFinger for ${acctLower}: invalid subject ${f1.subject}`);
	}
	const username2 = m[1].toLowerCase();
	const host2 = m[2].toLowerCase();
	const acctLower2 = `${username2}@${host2}`;

	const f2 = await resolveWebFinger(acctLower2);
	logger.debug(`WebFinger2: ${JSON.stringify(f2)}`);

	if (f2.subject.toLowerCase() === `acct:${acctLower2}` && f1.self.href === f2.self.href) {
		return f2.self;
	}

	logger.error(`Failed to WebFinger for ${acctLower}: subject missmatch`);
	throw new Error(`Failed to WebFinger for ${acctLower}: subject missmatch`);
}

export async function resolveWebFinger(query: string, queryHost?: string) {	// acctLower or uri
	logger.info(`WebFinger for ${query}`);
	const finger = await webFinger(query, queryHost).catch(e => {
		logger.error(`Failed to WebFinger for ${query} to ${queryHost || 'default'}: ${ e.statusCode || e.message }`);
		throw new Error(`Failed to WebFinger for ${query} to ${queryHost || 'default'}: ${ e.statusCode || e.message }`);
	});
	const self = finger.links.find(link => link.rel && link.rel.toLowerCase() === 'self');
	if (!self) {
		logger.error(`Failed to WebFinger for ${query} to ${queryHost || 'default'}: self link not found`);
		throw new Error('self link not found');
	}

	const subject = finger.subject;
	if (!subject) {
		logger.error(`Failed to WebFinger for ${query} to ${queryHost || 'default'}: subject not found`);
		throw new Error('subject not found');
	}

	return { subject, self };
}

export async function checkCanonical(uri: string) {
	// 普通にURIでWebFinger
	const f1 = await resolveWebFinger(uri);
	logger.debug(`WebFinger1: ${JSON.stringify(f1)}`);

	// URIのホストと…
	const queryHost = new URL(uri).host;

	// WebFinger応答のsubjectにあるacctの…
	const finger1Acct = f1.subject.toLowerCase();
	const m = finger1Acct.match(/^acct:([^@]+)@(.*)$/);
	if (!m) {
		const msg = `Failed to WebFinger1 for ${uri}: invalid subject ${f1.subject}`;
		logger.error(msg);
		throw new Error(msg);
	}
	// ホストは…
	const finger1host = m[2].toLowerCase();

	logger.info(`${uri}: ${queryHost} ${finger1host}`);

	// 一致してる？
	if (queryHost === finger1host) {
		// してればOK
		console.log('OK');
		return;
	}

	// してなければ、応答で指定されていたホストに再度WebFinger
	const f2 = await resolveWebFinger(finger1Acct, finger1host);
	logger.debug(`WebFinger2: ${JSON.stringify(f2)}`);

	const finger2Acct = f2.subject.toLowerCase();
	const m2 = finger2Acct.match(/^acct:([^@]+)@(.*)$/);
	if (!m2) {
		const msg = `Failed to WebFinger2 for ${finger1Acct} to ${finger1host}: invalid subject ${f2.subject}`;
		logger.error(msg);
		throw new Error(msg);
	}
	const finger2host = m2[2].toLowerCase();

	if (finger1host === finger2host) {
		// してればOK
		console.log('OK');

		await User.update({ uri }, {
			$set: {
				canonicalHost: toDbHost(finger2host)
			}
		});

		return;
	}

	throw new Error('checkCanonical failed');
}
