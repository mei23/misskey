/* eslint-disable node/no-unpublished-require */
// JSONのテンプレ作るスクリプト

export const data = `face	1FAE8	shaking face
symbols	1FA77	pink heart
symbols	1FA75	light blue heart
symbols	1FA76	grey heart
people	1FAF7	leftwards pushing hand
people	1FAF8	rightwards pushing hand
animals_and_nature	1FACE	moose
animals_and_nature	1FACF	donkey
animals_and_nature	1FABD	wing
animals_and_nature	1F426 200D 2B1B	black bird
animals_and_nature	1FABF	goose
animals_and_nature	1FABC	jellyfish
animals_and_nature	1FABB	hyacinth
food_and_drink	1FADA	ginger root
food_and_drink	1FADB	pea pod
objects	1FAAD	folding hand fan
objects	1FAAE	hair pick
activity	1FA87	maracas
activity	1FA88	flute
symbols	1FAAF	khanda
symbols	1F6DC	wireless`;

for (const line of data.split(/\n/)) {
	const m = line.match(/^([0-9A-Za-z_]+)\t([0-9A-Fa-f ]+)\t([0-9A-Za-z ]+)$/);
	if (!m) throw `unmatch ${line}`;
	const codes = m[2].split(/ /).map(x => parseInt(x, 16));
	//console.log(codes);
	const char = String.fromCodePoint(...codes);
	//console.log(m[1].split(/ /).map(x => String.fromCharCode(parseInt(x, 16))).join());

	const obj = {
		category: m[1],
		char,
		name: m[3].replace(/ /g, '_'),
		keywords: [],
	};

	//console.log(`${char} -- ${m[1]} -- ${m[3]}`);

	console.log(`  ${JSON.stringify(obj)},`);
}
