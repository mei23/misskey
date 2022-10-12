import { Predicate } from './relation';

/**
 * Count the number of elements that satisfy the predicate
 */

export function countIf<T>(f: Predicate<T>, xs: T[]): number {
	return xs.filter(f).length;
}

/**
 * Count the number of elements that is equal to the element
 */
export function count<T>(a: T, xs: T[]): number {
	return countIf(x => x === a, xs);
}

/**
 * Concatenate an array of arrays
 */
export function concat<T>(xss: T[][]): T[] {
	return ([] as T[]).concat(...xss);
}

export function removeNull<T>(src: (T | null | undefined)[]): T[] {
	return src.filter((x): x is T => x != null);
}

/**
 * Returns the array of elements that is not equal to the element
 */
export function erase<T>(a: T | null, xs: T[]): T[] {
	return xs.filter(x => x !== a);
}

/**
 * Remove all but the first element from every group of equivalent elements
 */
export function unique<T>(xs: T[]): T[] {
	return [...new Set(xs)];
}

export function sum(xs: number[]): number {
	return xs.reduce((a, b) => a + b, 0);
}

export function maximum(xs: number[]): number {
	return Math.max(...xs);
}

export function groupBy<T>(collections: T[], keySerector: (x: T) => string) {
	return collections.reduce((obj: Record<string, T[]>, item: T) => {
		const key = keySerector(item);
		if (!Object.prototype.hasOwnProperty.call(obj, key)) {
			obj[key] = [];
		}

		obj[key].push(item);

		return obj;
	}, {});
}

/**
 * Compare two arrays by lexicographical order
 */
export function lessThan(xs: number[], ys: number[]): boolean {
	for (let i = 0; i < Math.min(xs.length, ys.length); i++) {
		if (xs[i] < ys[i]) return true;
		if (xs[i] > ys[i]) return false;
	}
	return xs.length < ys.length;
}

// Object.fromEntries()
export function fromEntries(xs: [string, any][]): { [x: string]: any; } {
	return xs.reduce((obj, [k, v]) => Object.assign(obj, { [k]: v }), {} as { [x: string]: any; });
}

export function toArray<T>(x: T | T[] | undefined): T[] {
	return Array.isArray(x) ? x : x != null ? [x] : [];
}

export function toSingle<T>(x: T | T[] | undefined): T | undefined {
	return Array.isArray(x) ? x[0] : x;
}
