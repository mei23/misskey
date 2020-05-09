import { removeRelay } from '../services/relay';

async function main(inbox: string): Promise<any> {
	const relay = await removeRelay(inbox);
	console.log(JSON.stringify(relay, null, 2));
}

const args = process.argv.slice(2);

main(args[0]).then(() => {
	//process.exit(0);
}).catch(e => {
	console.warn(e);
	//process.exit(1);
});
