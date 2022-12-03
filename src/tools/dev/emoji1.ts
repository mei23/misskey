/* eslint-disable node/no-unpublished-require */

// emojilist に st(skintone) フラグを追加するスクリプト

/*
import { emojilist } from '../../misc/emojilist';

export const emojidata = require('emoji-datasource/emoji.json') as {
	unified: string,
	skin_variations: unknown,
}[];

// stあるものリスト
const hasSts = new Set<string>();

for (const data of emojidata) {
	// normalize
	let codes = data.unified.split(/-/).map(x => x.toLowerCase());
	if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
	codes = codes.filter(x => x && x.length);
	const sig = codes.join('-');

	const hasSt = Object.keys(data.skin_variations || {}).length === 5;

	if (hasSt) {
		hasSts.add(sig);
		//console.log(sig);
	}
}

console.log(`[`);
for (const emoji of emojilist) {
	const sig = char2file(emoji.char);

	if (hasSts.has(sig)) emoji.st = 1;

	console.log(`  ${JSON.stringify(emoji)},`);
}
console.log(`]`);

function char2file(char: string) {
	let codes = Array.from(char).map(x => x.codePointAt(0)!.toString(16));
	if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
	codes = codes.filter(x => x && x.length);
	return codes.join('-');
}
*/
