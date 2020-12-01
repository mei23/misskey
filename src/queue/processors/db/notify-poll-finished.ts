import * as mongo from 'mongodb';
import * as Bull from 'bull';
import { queueLogger } from '../../logger';
import Note from '../../../models/note';
import { NotifyPollFinishedData } from '../..';
import { createNotification } from '../../../services/create-notification';
import { getInstanceActor } from '../../../services/instance-actor';

const logger = queueLogger.createSubLogger('notify-poll-finished');

export async function notifyPollFinished(job: Bull.Job<NotifyPollFinishedData>): Promise<string> {
	logger.info(`${job.data.noteId} for ${job.data.userId} ...`);

	const note = await Note.findOne(job.data.noteId);
	if (note == null) {
		return `skip: poll not found (${job.data.noteId})`;
	}

	if (note.deletedAt) {
		return `skip: poll deleted (${job.data.noteId})`;
	}

	const notifee = new mongo.ObjectID(job.data.userId);
	const nofifer = await getInstanceActor();

	createNotification(notifee, nofifer._id, 'poll_finished', {
		noteId: note._id,
	});

	return `ok`;
}
