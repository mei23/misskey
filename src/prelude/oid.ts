
export function oidEquals(x: any, y: any): boolean {
	if (x == null && y == null) return true;
	return `${x}` === `${y}`;
}

export function oidIncludes(array: any[] | null, target: any): boolean {
	const map = new Set<string>;
	for (const v of (array || [])) map.add(`${v}`);
	return map.has(`${target}`);
}
