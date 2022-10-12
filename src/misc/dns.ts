import * as dns from 'dns';

type LookupOneCallback = (err: Error | null, address?: string, family?: number) => void;

export function lookup(hostname: string, options: { family?: number, hints?: number }, callback: LookupOneCallback) {
	if (options.family === 4) {
		dns.promises.resolve4(hostname).then(addresses => {
			callback(null, pickRandom(addresses), 4);
		}).catch(err => {
			callback(err);
		});
	} else if (options.family === 6) {
		dns.promises.resolve6(hostname).then(addresses => {
			callback(null, pickRandom(addresses), 6);
		}).catch(err => {
			callback(err);
		});
	} else {
		dns.promises.resolve4(hostname).then(addresses => {
			callback(null, pickRandom(addresses), 4);
		}).catch(err4 => {
			dns.promises.resolve6(hostname).then(addresses => {
				callback(null, pickRandom(addresses), 6);
			}).catch(err6 => {
				callback(err6);
			});
		});
	}
}

function pickRandom(s: string[]) {
	return s[Math.floor(Math.random() * s.length)]
}
