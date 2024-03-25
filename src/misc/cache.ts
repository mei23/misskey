import autobind from 'autobind-decorator';

type CacheEntry<T> = {
	time: number;
	value: T;
}

export class MemoryCache<T> {
	private cache: Map<string, CacheEntry<T>>;
	private ttl: number;

	/**
	 * Constructor
	 * @param ttl Entry TTL (ms)
	 */
	constructor(ttl: number) {
		this.cache = new Map();
		this.ttl = ttl;
	}

	@autobind
	private get(key: string): CacheEntry<T> | undefined {
		const entry = this.cache.get(key);

		if (entry == null) return undefined;	// MISS

		const age = Date.now() - entry.time;
		if (age > this.ttl) {
			this.cache.delete(key);
			return undefined;	// EXPIRED
		}

		return entry;	// HIT
	}

	@autobind
	public async fetch(key: string, fetcher: () => Promise<T>): Promise<T> {
		const entry = this.get(key);

		if (entry != null) {
			return entry.value;	// HIT
		}

		const value = await fetcher();

		this.cache.set(key, {
			time: Date.now(),
			value,
		});

		return value;
	}
}
