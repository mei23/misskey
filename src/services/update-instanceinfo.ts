import { getJson, getHtml } from '../misc/fetch';
import Instance, { IInstance } from '../models/instance';
import { toApHost } from '../misc/convert-host';
import Logger from './logger';
import { InboxRequestData } from '../queue/types';
import { geoIpLookup } from './geoip';
import { JSDOM } from 'jsdom';
import config from '../config';

export const logger = new Logger('instanceinfo', 'cyan');

type Nodeinfo = {
	version: '1.0' | '1.1' | '2.0' | '2.1';
	software: {
		name: string;
		version: string;
	};
	protocols: any;	// 1.0 <=> 2.0 で差があるけど使わないので省略
	services: any;	// 1.0 <=> 2.0 で差があるけど使わないので省略
	openRegistrations: boolean;
	usage: {
		users: {
			total?: number;
			activeHalfyear?: number;
			activeMonth?: number;
		};
		localPosts?: number;
		localComments?: number;
	};
	metadata?: {
		name?: string;
		nodeName?: string;
		description?: string;
		nodeDescription?: string;
		maintainer?: {
			name?: string;
			email?: string;
		};
		upstream?: {
			name?: string;
		};
	};
};

export async function UpdateInstanceinfo(instance: IInstance, request?: InboxRequestData) {
	const _instance = await Instance.findOne({ host: instance.host });
	if (!_instance) throw 'Instance is not registed';

	const updateNeeded = () => {
		if (!_instance.infoUpdatedAt) return true;

		const now = Date.now();
		if (now - _instance.infoUpdatedAt.getTime() > 1000 * 60 * 60 * 24) return true; 

		if (request?.ip && !_instance.isp && (now - _instance.infoUpdatedAt.getTime() > 1000 * 60 * 60 * 1)) return true;

		return false;
	};

	if (!updateNeeded()) return;

	await Instance.update({ _id: instance._id }, {
		$set: {
			infoUpdatedAt: new Date(),
		}
	});

	logger.info(`Fetching nodeinfo of ${instance.host} ...`);
	const info = await fetchInstanceinfo(toApHost(instance.host));
	logger.info(JSON.stringify(info, null, 2));

	const set = {
		infoUpdatedAt: new Date(),
		softwareName: info.softwareName,
		softwareVersion: info.softwareVersion,
		openRegistrations: info.openRegistrations,
		name: info.name,
		description: info.description,
		maintainerName: info.maintainerName,
		maintainerEmail: info.maintainerEmail,
		activeHalfyear: info.activeHalfyear,
		activeMonth: info.activeMonth,
	} as IInstance;

	if (info.notesCount) set.notesCount = info.notesCount;
	if (info.usersCount) set.usersCount = info.usersCount;

	await Instance.update({ _id: instance._id }, {
		$set: set
	});

	// GeoIP
	const geoip = (request?.ip && config.enableInstanceGeoIp) ? await geoIpLookup(request.ip).catch(e => {
		logger.warn(`GeoIP failed for ${toApHost(instance.host!)} ${request.ip} ${e}`);
		return { cc: '??', isp: '??', org: '??', as: '??' };
	}) : null;
	if (geoip) {
		logger.info(`GeoIP: ${toApHost(instance.host!)} ${request?.ip} => ${JSON.stringify(geoip)}`);
		await Instance.update({ _id: instance._id }, {
			$set: {
				infoUpdatedAt: new Date(),
				cc: geoip.cc,
				isp: geoip.isp,
				org: geoip.org,
				as: geoip.as,
			}
		});
	}

	// top
	const { iconUrl, manifestUrl } = await(fetchTop(instance)).catch(e => {
		logger.warn(`fetchTop failed for ${toApHost(instance.host!)} ${e}`);
		return {
			iconUrl: null,
			manifestUrl: null,
		};
	});

	if (iconUrl) {
		logger.info(`iconUrl: ${toApHost(instance.host!)} => ${iconUrl}`);
		await Instance.update({ _id: instance._id }, {
			$set: {
				iconUrl
			}
		});
	}

	if (manifestUrl) {
		const manifest = await fetchManifest(manifestUrl).catch(e => {
			logger.warn(`fetchManifest failed for ${toApHost(instance.host!)} ${e}`);
			return null;
		});

		if (manifest?.theme_color) {
			logger.info(`themeColor: ${toApHost(instance.host!)} => ${manifest.theme_color}`);
			await Instance.update({ _id: instance._id }, {
				$set: {
					themeColor: manifest.theme_color
				}
			});
		}
	}
}

export async function fetchInstanceinfo(host: string) {
	// fetch nodeinfo
	const info = await fetchNodeinfo(host).catch(() => null);

	let name = info?.metadata?.nodeName || info?.metadata?.name || null;
	let description = info?.metadata?.nodeDescription || info?.metadata?.description || null;
	let maintainerName = info?.metadata?.maintainer?.name || null;
	let maintainerEmail = info?.metadata?.maintainer?.email || null;

	// fetch Mastodon API
	if (info?.software.name === 'mastodon' || info?.metadata?.upstream?.name === 'mastodon') {
		const mastodon = await fetchMastodonInstance(toApHost(host)!).catch(() => {});
		if (mastodon) {
			name = mastodon.title;
			description = mastodon.description;
			maintainerEmail = mastodon.email;
			maintainerName = mastodon.contact_account?.acct ? `acct:${mastodon.contact_account?.acct}` : null;
		}
	}

	return {
		softwareName: info?.software?.name,
		softwareVersion: info?.software?.version,
		openRegistrations: info?.openRegistrations,
		name,
		description,
		maintainerName,
		maintainerEmail,
		activeHalfyear: expectNumber(info?.usage?.users?.activeHalfyear),
		activeMonth: expectNumber(info?.usage?.users?.activeMonth),
		usersCount: expectNumber(info?.usage?.users.total),
		notesCount: expectNumber(info?.usage?.localPosts),
	};
}

export async function fetchNodeinfo(host: string) {
	const wellKnownUrl = `https://${host}/.well-known/nodeinfo`;
	const wellKnown = (await getJson(wellKnownUrl)) as {
		links: {
			rel: string;
			href: string;
		}[]
	};

	const links = ['1.0', '1.1', '2.0', '2.1']
		.map(v => wellKnown.links.find(link => link.rel === `http://nodeinfo.diaspora.software/ns/schema/${v}`))
		.filter(x => x != null);

	const link = links[0];

	if (!link) throw 'supported nodeinfo is not found';

	const nodeinfo = (await getJson(link.href)) as Nodeinfo;

	return nodeinfo;
}

async function fetchMastodonInstance(host: string) {
	const json = (await getJson(`https://${host}/api/v1/instance`)) as {
		version: string;
		title: string;
		short_description: string;
		description: string;
		email: string;
		contact_account?: {
			acct?: string
		};
	};

	return json;
}

async function fetchTop(instance: IInstance): Promise<{
	iconUrl: string | null;
	manifestUrl: string | null;
}> {
	const host = toApHost(instance.host);

	logger.info(`Fetching icon URL of ${host} ...`);

	const url = 'https://' + host;

	const html = await getHtml(url);

	const { window } = new JSDOM(html);
	const doc = window.document;

	const hrefAppleTouchIconPrecomposed = doc.querySelector('link[rel="apple-touch-icon-precomposed"]')?.getAttribute('href');
	const hrefAppleTouchIcon = doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href');
	const hrefIcon = doc.querySelector('link[rel="icon"]')?.getAttribute('href');

	const href = hrefIcon || hrefAppleTouchIconPrecomposed || hrefAppleTouchIcon || null;
	const iconUrl = href ? (new URL(href, url)).href : null;

	const manifestHref = doc.querySelector('link[rel="manifest"]')?.getAttribute('href');
	const manifestUrl = manifestHref ? (new URL(manifestHref, url)).href : null;

	return {
		iconUrl,
		manifestUrl,
	};
}

async function fetchManifest(url: string) {
	const json = (await getJson(url)) as {
		theme_color?: string;
	};

	return json;
}

function expectNumber(x: unknown) {
	if (typeof x === 'number') return x;
	return null;
}
