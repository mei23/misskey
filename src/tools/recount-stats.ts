import { RecountStats } from '../misc/recount-stats';

async function main() {
	await RecountStats();
}

main().then(() => {
	console.log('Done');
});
