/* eslint-disable node/no-unpublished-require */
// JSONのテンプレ作るスクリプト

export const data = `face	1F642 200D 2194 FE0F	head shaking horizontally
face	1F642 200D 2195 FE0F	head shaking vertically
people	1F9D1 200D 1F9D1 200D 1F9D2	family adult adult child
people	1F9D1 200D 1F9D1 200D 1F9D2 200D 1F9D2	family adult adult child child
people	1F9D1 200D 1F9D2	family adult child
people	1F9D1 200D 1F9D2 200D 1F9D2	family adult child child
animals_and_nature	1F426 200D 1F525	phoenix
food_and_drink	1F34B 200D 1F7E9	lime
food_and_drink	1F344 200D 1F7EB	brown mushroom
objects	26D3 FE0F 200D 1F4A5	broken chain`;

for (const line of data.split(/\n/)) {
	const m = line.match(/^([0-9A-Za-z_]+)\t([0-9A-Fa-f ]+)\t([0-9A-Za-z ]+)$/);
	if (!m) throw `unmatch ${line}`;

	// emojilist.json
	const codes = m[2].split(/ /).map(x => parseInt(x, 16));
	const char = String.fromCodePoint(...codes);
	//console.log(codes);
	//console.log(m[1].split(/ /).map(x => String.fromCharCode(parseInt(x, 16))).join());
	//console.log(`${char} -- ${m[1]} -- ${m[3]}`);

	const obj = {
		category: m[1],
		char,
		name: m[3].replace(/ /g, '_'),
		keywords: [],
	};

	console.log(`  ${JSON.stringify(obj)},`);

	// twemoji-parser:emoji.yml
	/*
	const twemojiCode = m[2].split(/ /).map(x => x.toLowerCase()).join('-');
	const tw = `  - unicode: "${twemojiCode}"
    description: "${m[3]}"
    keywords: ""`;
	console.log(tw);
	*/
}
