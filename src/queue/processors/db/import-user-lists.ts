import * as Bull from 'bull';
import * as mongo from 'mongodb';

import { queueLogger } from '../../logger';
import User from '../../../models/user';
import UserList from '../../../models/user-list';
import DriveFile from '../../../models/drive-file';
import { getOriginalUrl } from '../../../misc/get-drive-file-url';
import parseAcct from '../../../misc/acct/parse';
import resolveUser from '../../../remote/resolve-user';
import { pushUserToUserList } from '../../../services/user-list/push';
import { downloadTextFile } from '../../../misc/download-text-file';
import { isSelfHost, toDbHost } from '../../../misc/convert-host';
import { DbUserImportJobData } from '../../types';

const logger = queueLogger.createSubLogger('import-user-lists');

export async function importUserLists(job: Bull.Job<DbUserImportJobData>): Promise<string> {
	logger.info(`Importing user lists of ${job.data.user._id} ...`);

	const user = await User.findOne({
		_id: new mongo.ObjectID(job.data.user._id.toString())
	});

	if (user == null) {
		return `skip: user not found`;
	}

	const file = await DriveFile.findOne({
		_id: new mongo.ObjectID(job.data.fileId.toString())
	});

	if (file == null) {
		return `skip: file not found`;
	}

	const url = getOriginalUrl(file);

	const csv = await downloadTextFile(url);

	let linenum = 0;

	for (const line of csv.trim().split('\n')) {
		linenum++;

		try {
			const listName = line.split(',')[0].trim();
			const { username, host } = parseAcct(line.split(',')[1].trim());

			let list = await UserList.findOne({
				userId: user._id,
				title: listName
			});

			if (list == null) {
				list = await UserList.insert({
					createdAt: new Date(),
					userId: user._id,
					title: listName,
					userIds: []
				})!;
			}

			let target = isSelfHost(host) ? await User.findOne({
				host: null,
				usernameLower: username.toLowerCase()
			}) : await User.findOne({
				host: toDbHost(host),
				usernameLower: username.toLowerCase()
			});

			if (host == null && target == null) continue;

			if (target == null) {
				target = await resolveUser(username, host);
			}

			if (list.userIds.some(id => id.equals(target._id))) continue;

			pushUserToUserList(target, list);
		} catch (e) {
			logger.warn(`Error in line:${linenum} ${e}`);
		}
	}

	return `ok: Imported`;
}
