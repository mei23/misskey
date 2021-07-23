import $ from 'cafy';
import define from '../../../define';
import { deliverQueue, inboxQueue } from '../../../../../queue/queues';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		domain: {
			validator: $.str,
		},

		limit: {
			validator: $.optional.num,
			default: 250
		},
	}
};

export default define(meta, async (ps) => {

	const queue =
		ps.domain === 'deliver' ? deliverQueue :
		ps.domain === 'inbox' ? inboxQueue :
		null;

	const jobs = await queue.getJobs(['delayed'], 0, ps.limit);

	for (const job of jobs) {
		job.promote();
	}

	return;
});
