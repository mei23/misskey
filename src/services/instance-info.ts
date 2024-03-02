import { MemoryCache } from '../misc/cache';
import { registerOrFetchInstanceDoc } from './register-or-fetch-instance-doc';

const TTL = 1000 * 300;
const cache = new MemoryCache<string>(TTL);

export async function getHttpMessageSignaturesImplementationLevel(host: string) {
	const fetcher = async () => {
		const instance = await registerOrFetchInstanceDoc(host);
		return instance.httpMessageSignaturesImplementationLevel || '00';
	};

	const value = await cache.fetch(host, fetcher);
	return value;
}
