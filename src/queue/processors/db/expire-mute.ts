import * as mongo from 'mongodb';
import * as Bull from 'bull';
import { queueLogger } from '../../logger';
import { ExpireMuteJobData } from '../../types';
import Mute from '../../../models/mute';
import { publishMutingChanged } from '../../../services/server-event';

const logger = queueLogger.createSubLogger('expire-mute');

export async function expireMute(job: Bull.Job<ExpireMuteJobData>): Promise<string> {
	logger.info(`deleting mute ${job.data.muteId} ...`);

	const mute = await Mute.findOne({
		_id: new mongo.ObjectID(job.data.muteId),
		expiresAt: { $lt: new Date() }
	});

	if (mute == null) {
		return `skip: mute not found (${job.data.muteId})`;
	}

	await Mute.remove({
		_id: mute._id
	});

	publishMutingChanged(mute.muterId);

	return `ok: mute deleted: ${mute._id}`;
}
