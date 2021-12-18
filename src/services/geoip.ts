import Logger from './logger';
import config from '../config';
import { getResponse } from '../misc/fetch';
export const logger = new Logger('instanceinfo', 'cyan');

let nextResetTime = 0;

export async function geoIpLookup(ip: string) {
	// 抑制中？
	if (Date.now() < nextResetTime) {
		throw `suspended until ${nextResetTime}`;
	}

	if (ip == null) throw 'invalid ip';
	const url = `http://ip-api.com/json/${ip}`;

	const res = await getResponse({
		url,
		method: 'GET',
		headers: {
			'User-Agent': config.userAgent,
		},
		timeout: 10 * 1000,
		size: 10 * 1024 * 1024,
	});

	// 残りリクエストのチェック
	const rl = Number(res.headers['x-rl']);
	const ttl = Number(res.headers['x-ttl']);
	if (rl === 0) {
		nextResetTime = Date.now() + (ttl * 1000);
	}

	let json;
	json = await JSON.parse(res.body);

	if (json.status !== 'success') {
		throw json.message;
	}

	return {
		cc: json.countryCode,
		isp: json.isp,
		org: json.org,
		as: json.as,
	};
}
