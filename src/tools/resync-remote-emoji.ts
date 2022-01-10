// Usage: ... <name@host>

import Emoji from '../models/emoji';
import { resyncEmoji } from '../remote/activitypub/models/emoji';
import { toDbHost } from '../misc/convert-host';

async function main(xs: string[]) {
	for (const x of xs) {
		await resync(x).catch();
	}
}

async function resync(x: string): Promise<any> {
	x = x.replace(/:/g, '');
	x = x.replace(/\u200b/g, '');
	const m = x.match(/^([^@]+)@(.*)/);

	if (m) {
		const name = m[1];
		const host = toDbHost(m[2]);

		console.log(`resync ${name} ${host}`);

		const emoji = await Emoji.findOne({
			name,
			host
		});

		if (emoji == null) throw 'emoji not found';

		await resyncEmoji(emoji, true);
	}
}

// get args
const args = process.argv.slice(2);

main(args).then(() => {
	setTimeout(() => { console.log('\n======\n Done\n======'); }, 2 * 1000);
}).catch(e => {
	console.warn(e);
});
