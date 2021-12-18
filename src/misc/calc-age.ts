export function calcAge(dt: Date | number | string) {
	const date = new Date(dt);
	let y = date.getFullYear();
	let m0 = date.getMonth();
	let d = date.getDate();

	console.log(`${date} ${dt}`);

	if (date.toString() === 'Invalid Date' && typeof dt === 'string') {
		const m = dt.match(/^([+-]?\d{4,})-(\d{2})-(\d{2})$/);
		console.log(JSON.stringify(m));
		if (m) {
			y = Number(m[1]);
			m0 = Number(m[2]) - 1;
			d = Number(m[3]);
		}
	}

	const now = new Date();

	const yearDiff = now.getFullYear() - y;
	const monthDiff = now.getMonth() - m0;
	const pastDate = now.getDate() < d;

	// compare months. if same month, compare days
	if (monthDiff < 0 || (monthDiff === 0 && pastDate)) {
		return yearDiff - 1;
	} else {
		return yearDiff;
	}
}
