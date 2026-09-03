import * as Bull from 'bull';
import * as Deque from 'double-ended-queue';
import Xev from 'xev';
import { deliverQueue, inboxQueue, inboxLazyQueue } from '../queue/queues';
import config from '../config';
import { getWorkerStrategies } from '..';
import { deliverJobConcurrency, inboxJobConcurrency, inboxLazyJobConcurrency } from '../queue';

const ev = new Xev();

const interval = 3000;

class JobQueue<T> {
	private queue: Bull.Queue;
	private limit: number;

	private beActive = 0;
	private delay: number | null = null;

	constructor(queue: Bull.Queue, limit: number) {
		this.queue = queue;
		this.limit = limit;

		this.queue.on('global:active', async (jobId) => {
			this.beActive++;
			if (this.beActive === 1) {	// 各tickの最初でサンプリング
				const delay = await getDelay(deliverQueue, jobId);
				if (delay != null) this.delay = delay;
			}
		});
	}

	public async tick() {
		const counts = await this.queue.getJobCounts();

		const stat = {
			limit: this.limit,
			activeSincePrevTick: this.beActive,
			active: counts.active,
			waiting: counts.waiting,
			delayed: counts.delayed,
			delay: this.delay,
		};

		this.beActive = 0;

		return stat;
	}
}

/**
 * Report queue stats regularly
 */
export default function() {
	const st = getWorkerStrategies(config);
	const workers = st.workers + st.queues || 1;

	const log = new Deque<any>();

	ev.on('requestQueueStatsLog', x => {
		ev.emit(`queueStatsLog:${x.id}`, log.toArray().slice(0, x.length || 50));
	});

	const deliver = new JobQueue(deliverQueue, workers * deliverJobConcurrency);
	const inbox = new JobQueue(inboxQueue, workers * inboxJobConcurrency);
	const inboxLazy = new JobQueue(inboxLazyQueue, workers * inboxLazyJobConcurrency);

	async function tick() {
		const stats = {
			deliver: await deliver.tick(),
			inbox: await inbox.tick(),
			inboxLazy: await inboxLazy.tick(),
		};

		ev.emit('queueStats', stats);

		log.unshift(stats);
		if (log.length > 200) log.pop();
	}

	tick();

	setInterval(tick, interval);
}

async function getDelay(queue: Bull.Queue<any>, jobId: number) {
	const job = await queue.getJob(jobId);

	// たまたまリトライだったら諦める
	if (job && job.attemptsMade === 0 && job.opts?.delay === 0 && job.processedOn) {
		const delay = job.processedOn - job.timestamp;
		return delay;
	}

	return null;
}
