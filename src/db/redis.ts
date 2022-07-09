import * as Redis from 'ioredis';
import config from '../config';

export function createConnection() {
	return new Redis({
		port: config.redis.port,
		host: config.redis.host,
		family: config.redis.family == null ? 0 : config.redis.family,
		password: config.redis.pass,
		keyPrefix: `${config.redis.prefix}:`,
		db: config.redis.db || 0,
	});
}

export const redisClient = createConnection();

export default redisClient;
