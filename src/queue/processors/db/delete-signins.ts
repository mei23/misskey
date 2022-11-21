import * as Bull from 'bull';
import * as mongo from 'mongodb';

import { queueLogger } from '../../logger';
import { DbUserJobData } from '../../types';
import Signin from '../../../models/signin';

const logger = queueLogger.createSubLogger('delete-signins');

export async function deleteSignins(job: Bull.Job<DbUserJobData>): Promise<string> {
	logger.info(`Deleting signins of ${job.data.user._id} ...`);

	const result = await Signin.remove({ userId: new mongo.ObjectID(job.data.user._id.toString()) });

	return `ok: Signins of ${job.data.user._id} has been deleted. (${result.deletedCount} records)`;
}
