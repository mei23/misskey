import * as httpSignature from 'http-signature';
import config from '../config';
import { InboxInfo, InboxRequestData } from './types';
import { deliverQueue, inboxQueue, dbQueue } from './queues';
import { getJobInfo } from './get-job-info';
import processDeliver from './processors/deliver';
import processInbox from './processors/inbox';
import processDb from './processors/db';
import { queueLogger } from './logger';
import { ILocalUser, IUser } from '../models/user';
import { IDriveFile } from '../models/drive-file';
import { INote } from '../models/note';
import { IMute } from '../models/mute';
import { IActivity } from '../remote/activitypub/type';
import queueChart from '../services/chart/queue';

const deliverLogger = queueLogger.createSubLogger('deliver');
const inboxLogger = queueLogger.createSubLogger('inbox');
const dbLogger = queueLogger.createSubLogger('db');

let deliverDeltaCounts = 0;
let inboxDeltaCounts = 0;

deliverQueue
	.on('waiting', (jobId) => {
		deliverDeltaCounts++;
		deliverLogger.debug(`waiting id=${jobId}`);
	})
	.on('active', (job) => deliverLogger.info(`active ${getJobInfo(job, true)} to=${job.data.to}`))
	.on('completed', (job, result) => deliverLogger.info(`completed(${result}) ${getJobInfo(job, true)} to=${job.data.to}`))
	.on('failed', (job, err) => {
		const msg = `failed(${err}) ${getJobInfo(job)} to=${job.data.to}`;
		job.log(msg);
		deliverLogger.warn(msg);
	})
	.on('error', (error) => deliverLogger.error(`error ${error}`))
	.on('stalled', (job) => deliverLogger.warn(`stalled ${getJobInfo(job)} to=${job.data.to}`));

inboxQueue
	.on('waiting', (jobId) => {
		inboxDeltaCounts++;
		inboxLogger.debug(`waiting id=${jobId}`);
	})
	.on('active', (job) => inboxLogger.info(`active ${getJobInfo(job, true)} activity=${job.data.activity ? job.data.activity.id : 'none'}`))
	.on('completed', (job, result) => inboxLogger.info(`completed(${result}) ${getJobInfo(job, true)} activity=${job.data.activity ? job.data.activity.id : 'none'}`))
	.on('failed', (job, err) => {
		const msg = `failed(${err}) ${getJobInfo(job)} activity=${job.data.activity ? job.data.activity.id : 'none'}`;
		job.log(msg);
		inboxLogger.warn(msg);
	})
	.on('error', (error) => inboxLogger.error(`error ${error}`))
	.on('stalled', (job) => inboxLogger.warn(`stalled ${getJobInfo(job)} activity=${job.data.activity ? job.data.activity.id : 'none'}`));

dbQueue
	.on('waiting', (jobId) => dbLogger.debug(`waiting id=${jobId}`))
	.on('active', (job) => dbLogger.info(`${job.name} active ${getJobInfo(job, true)}`))
	.on('completed', (job, result) => dbLogger.info(`${job.name} completed(${result}) ${getJobInfo(job, true)}`))
	.on('failed', (job, err) => dbLogger.warn(`${job.name} failed(${err}) ${getJobInfo(job)}`))
	.on('error', (error) => dbLogger.error(`error ${error}`))
	.on('stalled', (job) => dbLogger.warn(`${job.name} stalled ${getJobInfo(job)}`));

// Chart bulk write
setInterval(() => {
	if (deliverDeltaCounts === 0 && inboxDeltaCounts === 0) return;
	queueChart.update(deliverDeltaCounts, inboxDeltaCounts);
	deliverDeltaCounts = 0;
	inboxDeltaCounts = 0;
}, 5000);
//#endregion

/**
 * Queue deliver job
 * @param user Actor
 * @param content Activity
 * @param to URL to deliver
 * @param lowSeverity Reduce retry count
 * @param inboxInfo Detail information of inbox
 */
export function deliver(user: ILocalUser, content: any, to: string, lowSeverity = false, inboxInfo?: InboxInfo) {
	if (config.disableFederation) return;

	const attempts = lowSeverity ? 2 : (config.deliverJobMaxAttempts || 12);

	if (content == null) return null;

	const data = {
		user: {
			_id: `${user._id}`,
			keypair: user.keypair
		},
		content,
		to,
		inboxInfo
	};

	return deliverQueue.add(data, {
		attempts,
		timeout: 1 * 60 * 1000,	// 1min
		backoff: {
			type: 'apBackoff'
		},
		removeOnComplete: true,
		removeOnFail: true
	});
}

/**
 * Queue inbox job
 * @param activity Activity
 * @param signature Signature
 */
export function inbox(activity: IActivity, signature: httpSignature.IParsedSignature, request: InboxRequestData) {
	const data = {
		activity,
		signature,
		request,
	};

	return inboxQueue.add(data, {
		attempts: config.inboxJobMaxAttempts || 8,
		timeout: 5 * 60 * 1000,	// 5min
		backoff: {
			type: 'apBackoff'
		},
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createDeleteNotesJob(user: IUser) {
	return dbQueue.add('deleteNotes', {
		user: { _id: `${user._id}` }
	}, {
		timeout: 3 * 60 * 60 * 1000,	// 3hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createDeleteDriveFilesJob(user: IUser) {
	return dbQueue.add('deleteDriveFiles', {
		user: { _id: `${user._id}` }
	}, {
		timeout: 3 * 60 * 60 * 1000,	// 3hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createDeleteNoteJob(note: INote, delay: number) {
	return dbQueue.add('deleteNote', {
		noteId: `${note._id}`
	}, {
		delay,
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

/**
 * Create deleteSignins Job
 * @param user
 * @param delay Delay in ms
 */
export function createDeleteSigninsJob(user: IUser, delay: number) {
	return dbQueue.add('deleteSignins', {
		user: { _id: `${user._id}` }
	}, {
		delay,
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExpireMuteJob(mute: IMute) {
	if (!mute.expiresAt) return;
	let delay = mute.expiresAt.getTime() - Date.now() + 1000;
	if (delay < 0) delay = 1000;

	return dbQueue.add('expireMute', {
		muteId: `${mute._id}`
	}, {
		delay,
		timeout: 5 * 60 * 1000,	// 5min
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createNotifyPollFinishedJob(note: INote, user: ILocalUser, expiresAt: Date) {
	let delay = expiresAt.getTime() - Date.now() + 2000;
	if (delay < 0) delay = 2000;

	return dbQueue.add('notifyPollFinished', {
		noteId: `${note._id}`,
		userId: `${user._id}`
	}, {
		delay,
		timeout: 5 * 60 * 1000,	// 5min
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportNotesJob(user: ILocalUser) {
	return dbQueue.add('exportNotes', {
		user: { _id: `${user._id}` }
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportFollowingJob(user: ILocalUser) {
	return dbQueue.add('exportFollowing', {
		user: { _id: `${user._id}` }
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportMuteJob(user: ILocalUser) {
	return dbQueue.add('exportMute', {
		user: { _id: `${user._id}` }
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportBlockingJob(user: ILocalUser) {
	return dbQueue.add('exportBlocking', {
		user: { _id: `${user._id}` }
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createExportUserListsJob(user: ILocalUser) {
	return dbQueue.add('exportUserLists', {
		user: { _id: `${user._id}` }
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createImportFollowingJob(user: ILocalUser, fileId: IDriveFile['_id']) {
	return dbQueue.add('importFollowing', {
		user: { _id: `${user._id}` },
		fileId: `${fileId}`
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createImportBlockingJob(user: ILocalUser, fileId: IDriveFile['_id']) {
	return dbQueue.add('importBlocking', {
		user: { _id: `${user._id}` },
		fileId: `${fileId}`
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createImportMuteJob(user: ILocalUser, fileId: IDriveFile['_id']) {
	return dbQueue.add('importMute', {
		user: { _id: `${user._id}` },
		fileId: `${fileId}`
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export function createImportUserListsJob(user: ILocalUser, fileId: IDriveFile['_id']) {
	return dbQueue.add('importUserLists', {
		user: { _id: `${user._id}` },
		fileId: `${fileId}`
	}, {
		timeout: 1 * 60 * 60 * 1000,	// 1hour
		removeOnComplete: true,
		removeOnFail: true
	});
}

export default function() {
	deliverQueue.process(config.deliverJobConcurrency || 128, processDeliver);
	inboxQueue.process(config.inboxJobConcurrency || 16, processInbox);
	processDb(dbQueue);
}

export function destroy(domain?: string) {
	if (domain == null || domain === 'deliver') {
		deliverQueue.once('cleaned', (jobs, status) => {
			deliverLogger.succ(`Cleaned ${jobs.length} ${status} jobs`);
		});
		deliverQueue.clean(0, 'delayed');
	}

	if (domain == null || domain === 'inbox') {
		inboxQueue.once('cleaned', (jobs, status) => {
			inboxLogger.succ(`Cleaned ${jobs.length} ${status} jobs`);
		});
		inboxQueue.clean(0, 'delayed');
	}

	if (domain === 'db') {
		dbQueue.once('cleaned', (jobs, status) => {
			dbLogger.succ(`Cleaned ${jobs.length} ${status} jobs`);
		});
		dbQueue.clean(0, 'delayed');
	}
}
