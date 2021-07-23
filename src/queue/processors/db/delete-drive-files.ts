import * as Bull from 'bull';
import * as mongo from 'mongodb';

import { queueLogger } from '../../logger';
import User from '../../../models/user';
import DriveFile from '../../../models/drive-file';
import deleteFile from '../../../services/drive/delete-file';
import { DbUserJobData } from '../../types';

const logger = queueLogger.createSubLogger('delete-drive-files');

export async function deleteDriveFiles(job: Bull.Job<DbUserJobData>): Promise<string> {
	logger.info(`Deleting drive files of ${job.data.user._id} ...`);

	const user = await User.findOne({
		_id: new mongo.ObjectID(job.data.user._id.toString())
	});

	if (user == null) {
		return `skip: user not found`;
	}

	let deletedCount = 0;
	let cursor: any = null;

	const total = await DriveFile.count({
		userId: user._id,
	});

	while (true) {
		const files = await DriveFile.find({
			userId: user._id,
			...(cursor ? { _id: { $gt: cursor } } : {})
		}, {
			limit: 100,
			sort: {
				_id: 1
			}
		});

		if (files.length === 0) {
			job.progress(100);
			break;
		}

		cursor = files[files.length - 1]._id;

		for (const file of files) {
			await deleteFile(file);
			deletedCount++;
		}

		job.progress(deletedCount / total);
	}

	return `ok: All drive files (${deletedCount}) of ${user._id} has been deleted.`;
}
