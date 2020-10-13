import { URL } from 'url';

import { IDriveFile, validateFileName } from '../../models/drive-file';
import { addFile } from './add-file';
import { IUser } from '../../models/user';
import * as mongodb from 'mongodb';
import { driveLogger } from './logger';
import { createTemp } from '../../misc/create-temp';
import { downloadUrl } from '../../misc/download-url';

const logger = driveLogger.createSubLogger('downloader');

export const uploadFromUrl = async (
	url: string,
	user: IUser,
	folderId: mongodb.ObjectID | null = null,
	uri: string | null = null,
	sensitive = false,
	force = false,
	link = false
): Promise<IDriveFile> => {
	// Create temp file
	const [path, cleanup] = await createTemp();

	// write content at URL to temp file
	await downloadUrl(url, path);
	const info = await downloadUrl(url, path);

	let name: string | null = null;

	name = new URL(info.url).pathname.split('/').pop() || null;

	if (name && !validateFileName(name)) {
		name = null;
	}

	let driveFile: IDriveFile;
	let error;

	try {
		driveFile = await addFile(user, path, name, null, folderId, force, link, url, uri, sensitive);
		logger.succ(`Got: ${driveFile._id}`);
	} catch (e) {
		error = e;
		logger.error(`Failed to create drive file: ${e}`, {
			url: url,
			e: e
		});
	}

	// clean-up
	cleanup();

	if (error) {
		throw error;
	} else {
		return driveFile;
	}
};
