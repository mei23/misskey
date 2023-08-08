import * as Limiter from 'async-ratelimiter';
import limiterDB from '../../db/redis';
import { IEndpoint } from './endpoints';
import { IUser } from '../../models/user';
import Logger from '../../services/logger';
import { addrToPeer } from '../../misc/addr-to-peer';

const logger = new Logger('limiter');

/**
 * Increment and check limit
 * @returns Return if OK, otherwise throw.
 */
export async function incrementAndCheck(endpoint: IEndpoint, user: IUser | null | undefined, ip?: string) {
	if (limiterDB == null) return;	// OK (Limiter DB unavailable)

	const limitation = endpoint.meta.limit;
	if (limitation == null) return;	// OK (Limit undefined)

	// Prepare limiter
	const target = genTargetKey(user, ip);
	const key = genEpKey(endpoint);

	// Check min interval (minimum attempt interval)
	if (typeof limitation.minInterval === 'number') {
		const limiter = new Limiter({
			db: limiterDB,
			duration: limitation.minInterval,
			max: 1,
		});

		const info = await limiter.get({
			id: `${target}:${key}:min`,
		});

		logger.debug(`${target} ${key} min remaining: ${info.remaining}`);

		if (info.remaining === 0) throw new Error('BRIEF_REQUEST_INTERVAL');
	}

	// Check max interval (general per-sec interval)
	if (typeof limitation.duration === 'number' && typeof limitation.max === 'number') {
		const limiter = new Limiter({
			db: limiterDB,
			duration: limitation.duration,
			max: limitation.max,
		});

		const info = await limiter.get({
			id: `${target}:${key}`,
		});

		logger.debug(`${target} ${key} max remaining: ${info.remaining}`);

		if (info.remaining === 0) throw new Error('RATE_LIMIT_EXCEEDED');
	}

	return;	// OK (Passed all checks)
}

/**
 * Generate target key
 */
function genTargetKey(user: IUser | null | undefined, ip: string | null | undefined): string | null {
	if (user) return user._id;
	if (ip) return addrToPeer(ip) ?? null;
	return null;
}

/***
 * Generate endpoint key
 */
function genEpKey(endpoint: IEndpoint) {
	return endpoint.meta.limit?.key ?? endpoint.name;
}

export default incrementAndCheck;
