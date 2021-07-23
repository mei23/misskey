import * as Limiter from 'ratelimiter';
import limiterDB from '../../db/redis';
import { IEndpoint } from './endpoints';
import getAcct from '../../misc/acct/render';
import { IUser } from '../../models/user';
import Logger from '../../services/logger';
import { addrToPeer } from '../../misc/addr-to-peer';

const logger = new Logger('limiter');

export default (endpoint: IEndpoint, user: IUser | null | undefined, ip?: string) => new Promise((ok, reject) => {
	// Redisがインストールされてない場合は常に許可
	if (limiterDB == null) {
		ok();
		return;
	}

	const limitation = endpoint.meta.limit;
	if (limitation == null) {
		ok();
		return;
	}

	const target = user ? user._id : ip ? addrToPeer(ip) : null;
	const targetName = user ? `@${getAcct(user)}` : ip ? addrToPeer(ip) : null;

	const key = limitation.hasOwnProperty('key')
		? limitation.key
		: endpoint.name;

	const hasShortTermLimit =
		limitation.hasOwnProperty('minInterval');

	const hasLongTermLimit =
		limitation.hasOwnProperty('duration') &&
		limitation.hasOwnProperty('max');

	if (hasShortTermLimit) {
		min();
	} else if (hasLongTermLimit) {
		max();
	} else {
		ok();
	}

	// Short-term limit
	function min() {
		const minIntervalLimiter = new Limiter({
			id: `${target}:${key}:min`,
			duration: limitation!.minInterval,
			max: 1,
			db: limiterDB!
		});

		minIntervalLimiter.get((err, info) => {
			if (err) {
				return reject('ERR');
			}

			logger.debug(`${targetName} ${endpoint.name} min remaining: ${info.remaining}`);

			if (info.remaining === 0) {
				reject('BRIEF_REQUEST_INTERVAL');
			} else {
				if (hasLongTermLimit) {
					max();
				} else {
					ok();
				}
			}
		});
	}

	// Long term limit
	function max() {
		const limiter = new Limiter({
			id: `${target}:${key}`,
			duration: limitation!.duration,
			max: limitation!.max,
			db: limiterDB!
		});

		limiter.get((err, info) => {
			if (err) {
				return reject('ERR');
			}

			logger.debug(`${targetName} ${endpoint.name} max remaining: ${info.remaining}`);

			if (info.remaining === 0) {
				reject('RATE_LIMIT_EXCEEDED');
			} else {
				ok();
			}
		});
	}
});
