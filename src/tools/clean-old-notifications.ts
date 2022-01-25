// 90日以前の通知を削除する
import Notification from '../models/notification';

async function main(days = 90) {
	const limit = new Date(Date.now() - (days * 1000 * 86400));

	const result = await Notification.remove({
		createdAt: { $lt: limit },
	});

	console.log(`deleted count:${result.deletedCount}`);
}

const args = process.argv.slice(2);

main(args[0]).then(() => {
	console.log('Done');
	setTimeout(() => {
		process.exit(0);
	}, 30 * 1000);
});
