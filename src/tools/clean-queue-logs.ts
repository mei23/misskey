import redis from '../db/redis';
import config from '../config';

async function main() {
	const prefix = config.redis.prefix ? `${config.redis.prefix}:queue` : 'queue';
	const pattern = `${prefix}:*:logs`;
	const keys = await redis.keys(pattern);

	for (const key of keys) {
		const queueKey = key.replace(/:logs$/, '');
		const queueExists = await redis.exists(stripPrefix(queueKey));
		if (queueExists) {
			console.log(key, 'skip');
		} else {
			const n = await redis.del(stripPrefix(key));
			console.log(key, `del ${ n ? 'OK' : 'NG '}`);
		}
	}
}

function stripPrefix(key: string): string {
	return config.redis.prefix ? key.substring(config.redis.prefix.length + 1) : key;
}

main().then(() => {
	console.log('Done. Exits after 30 seconds...');
	setTimeout(() => {
		process.exit(0);
	}, 30 * 1000);
});
