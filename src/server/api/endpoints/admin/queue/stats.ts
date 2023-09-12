import define from '../../../define';
import { deliverQueue, inboxQueue, inboxLazyQueue } from '../../../../../queue/queues';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {}
};

export default define(meta, async (ps) => {
	const deliverJobCounts = await deliverQueue.getJobCounts();
	const inboxJobCounts = await inboxQueue.getJobCounts();
	const inboxLazyJobCounts = await inboxLazyQueue.getJobCounts();

	return {
		deliver: deliverJobCounts,
		inbox: inboxJobCounts,
		inboxLazy: inboxLazyJobCounts,
	};
});
