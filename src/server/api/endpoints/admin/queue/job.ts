import $ from 'cafy';
import define from '../../../define';
import { deliverQueue, inboxQueue, inboxLazyQueue, dbQueue } from '../../../../../queue/queues';
import * as Bull from 'bull';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		domain: {
			validator: $.str.min(1),
		},

		jobId: {
			validator: $.str.min(1),
		},
	}
};

export default define(meta, async (ps) => {
	const queue =
		ps.domain === 'deliver' ? deliverQueue :
		ps.domain === 'inbox' ? inboxQueue :
		ps.domain === 'inboxLazy' ? inboxLazyQueue :
		ps.domain === 'db' ? dbQueue :
		null;

	if (queue == null) throw(`invalid domain`);

	const job = await (queue as Bull.Queue<any>).getJob(ps.jobId);
	const logs = await (queue as Bull.Queue<any>).getJobLogs(ps.jobId);

	return {
		job,
		logs: logs.logs,
	};
});
