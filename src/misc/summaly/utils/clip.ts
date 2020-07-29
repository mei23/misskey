export default function(s: string | null | undefined, max: number): string | null | undefined {
	if (s == null) return s;

	s = s.trim();

	if (s.length > max) {
		return s.substr(0, max) + '...';
	} else {
		return s;
	}
}
