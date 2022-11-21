import { readFileSync } from 'fs';
import * as moment from 'moment';

// https://svs.gsfc.nasa.gov/Gallery/moonphase.html
// 2022 https://svs.gsfc.nasa.gov/4955 https://svs.gsfc.nasa.gov/vis/a000000/a004900/a004955/mooninfo_2022.json
// 2023 https://svs.gsfc.nasa.gov/5048 https://svs.gsfc.nasa.gov/vis/a000000/a005000/a005048/mooninfo_2023.json

// Usage: fetch json and run
// npx ts-node src/tools/dev/nasa-moon.ts

type NasaMoon = {
	/** DateTime string (eg: 01 Jan 2023 00:00 UT) */
	time: string;
	phase: number;
	age: number;
	/** Diameter as arcseconds */
	diameter: number;
	/** Distance as km */
	distance: number;
	/** J2000 Right Ascension, Declination */
	j2000: {
		ra: number;
		dec: number;
	};
	/** Subsolar Longitude, Latitude */
	subsolar: {
		lon: number;
		lat: number;
	};
	/** Sub-Earth Longitude, Latitude */
	lon: {
		lon: number;
		lat: number;
	};
	/** Position Angle */
	posangle: number;
};

type Result = {
	/** UNIX time */
	u: number;
	/** Phase */
	p: number;
	/** Age */
	a: number;
};

function parse() {
	// src
	let nasa: NasaMoon[] = [];

	for (const file of [`${__dirname}/mooninfo_2022.json`, `${__dirname}/mooninfo_2023.json`]) {
		const x = JSON.parse(readFileSync(file, 'utf-8')) as NasaMoon[];
		nasa = nasa.concat(x);
	}

	const result: Result[] = [];

	for (let i = 0; i < nasa.length; i++) {
		const cur = nasa[i];

		// to UNIX
		const time = moment(cur.time);
		const unix = time.unix();

		const past = nasa[i - 1];
		if (!past) continue;

		// Pick after new-moon records
		if (cur.age < past.age) {
			result.push({
				u: unix,
				p: cur.phase,
				a: cur.age,
			});

			console.log(`// Pick ${time.unix()} ${time.toISOString()}`);
		}
	}
	console.log(JSON.stringify(result, null, 2));
}

parse();
