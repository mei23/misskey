import Instance from '../models/instance';
import { getServerSubscriber } from '../services/server-subscriber';
import { toApHost } from '../misc/convert-host';
import fetchMeta from '../misc/fetch-meta';

let blockedHosts: Set<string>;
let blockedHostsRegExp: Set<RegExp>;
let selfSilencedHosts: Set<string>;
let selfSilencedHostsRegExp: Set<RegExp>;
let closedHosts: Set<string>;

export async function isBlockedHost(host: string | null) {
	if (host == null) return false;
	if (!blockedHosts) await Update();

	if (blockedHosts?.has(toApHost(host))) return true;

	if (blockedHostsRegExp && Array.from(blockedHostsRegExp).some(x => x.test(toApHost(host)))) return true;

	return false;
}

export async function isSelfSilencedHost(host: string | null) {
	if (host == null) return false;
	if (!selfSilencedHosts) await Update();

	if (selfSilencedHosts?.has(toApHost(host))) return true;

	if (selfSilencedHostsRegExp && Array.from(selfSilencedHostsRegExp).some(x => x.test(toApHost(host)))) return true;

	return false;
}

export async function isClosedHost(host: string | null) {
	if (host == null) return false;
	if (!closedHosts) await Update();
	return closedHosts?.has(toApHost(host));
}

async function Update() {
	const meta = await fetchMeta();

	// block from instance/meta
	{
		const blocked = await Instance.find({
			isBlocked: true
		});
		const literals = new Set(blocked.map(x => toApHost(x.host)));

		const regExps = new Set<RegExp>();

		for (const b of (meta.blockedInstances || [])) {
			const m = b.match(/^[/](.*)[/]$/);
			if (m) {
				regExps.add(new RegExp(m[1]));
			} else {
				literals.add(b);
			}
		}

		blockedHosts = literals;
		blockedHostsRegExp = regExps;
	}

	// self-silence from meta
	{
		const literals = new Set<string>();
		const regExps = new Set<RegExp>();

		for (const b of (meta.selfSilencedInstances || [])) {
			const m = b.match(/^[/](.*)[/]$/);
			if (m) {
				regExps.add(new RegExp(m[1]));
			} else {
				literals.add(b);
			}
		}

		selfSilencedHosts = literals;
		selfSilencedHostsRegExp = regExps;
	}

	// closed from instance
	const closed = await Instance.find({
		isMarkedAsClosed: true
	});
	closedHosts = new Set(closed.map(x => toApHost(x.host)));
}

// 初回アップデート
Update();

// 一定時間ごとにアップデート
setInterval(() => {
	Update();
}, 300 * 1000);

// イベントでアップデート
const ev = getServerSubscriber();

ev.on('serverEvent', (data: any) => {
	if (data.type === 'instanceModUpdated') {
		Update();
	}
});
