import * as Bull from 'bull';
import config from '../config';

export function initialize<T>(name: string, limitPerSec = -1) {
	return new Bull<T>(name, config.redis != null ? {
		redis: {
			port: config.redis.port,
			host: config.redis.host,
			password: config.redis.pass,
			db: config.redis.db || 0,
		},
		prefix: config.redis.prefix ? `${config.redis.prefix}:queue` : 'queue',
		limiter: limitPerSec > 0 ? {
			max: limitPerSec,
			duration: 1000
		} : undefined
	} : undefined);
}
