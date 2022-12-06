import { isBlockedHost } from '../../services/instance-moderation';

async function main(host: string) {
	console.log(await isBlockedHost(host));
}

const args = process.argv.slice(2);

main(args[0]).then(() => {
	console.log('Done');
	setTimeout(() => {
		process.exit(0);
	}, 5 * 1000);
});
