import * as Bull from 'bull';
import * as tmp from 'tmp';
import * as fs from 'fs';
import * as mongo from 'mongodb';

import { queueLogger } from '../../logger';
import { addFile } from '../../../services/drive/add-file';
import User from '../../../models/user';
import { format } from 'date-fns';
import Mute from '../../../models/mute';
import { getFullApAccount } from '../../../misc/convert-host';
import { DbUserJobData } from '../../types';

const logger = queueLogger.createSubLogger('export-mute');

export async function exportMute(job: Bull.Job<DbUserJobData>): Promise<string> {
	logger.info(`Exporting mute of ${job.data.user._id} ...`);

	const user = await User.findOne({
		_id: new mongo.ObjectID(job.data.user._id.toString())
	});

	if (user == null) {
		return `skip: user not found`;
	}

	// Create temp file
	const [path, cleanup] = await new Promise<[string, any]>((res, rej) => {
		tmp.file((e, path, fd, cleanup) => {
			if (e) return rej(e);
			res([path, cleanup]);
		});
	});

	logger.info(`Temp file is ${path}`);

	const stream = fs.createWriteStream(path, { flags: 'a' });

	let exportedCount = 0;
	let cursor: any = null;

	// 期限付きのは常にリストに含まない
	const total = await Mute.count({
		expiresAt: null,
		muterId: user._id,
	});

	while (true) {
		const mutes = await Mute.find({
			expiresAt: null,
			muterId: user._id,
			...(cursor ? { _id: { $gt: cursor } } : {})
		}, {
			limit: 100,
			sort: {
				_id: 1
			}
		});

		if (mutes.length === 0) {
			job.progress(100);
			break;
		}

		cursor = mutes[mutes.length - 1]._id;

		for (const mute of mutes) {
			const u = await User.findOne({ _id: mute.muteeId }, { fields: { username: true, host: true } });
			if (u == null) continue;	// DB blocken ?
			const content = getFullApAccount(u.username, u.host);
			await new Promise((res, rej) => {
				stream.write(content + '\n', err => {
					if (err) {
						logger.error(err);
						rej(err);
					} else {
						res();
					}
				});
			});
			exportedCount++;
		}

		job.progress(exportedCount / total);
	}

	stream.end();
	logger.succ(`Exported to: ${path}`);

	const fileName = 'mute-' + format(new Date(), 'yyyy-MM-dd-HH-mm-ss') + '.csv';
	const driveFile = await addFile(user, path, fileName, undefined, undefined, true);

	cleanup();
	return `Exported to: ${driveFile._id}`;
}
