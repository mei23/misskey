import { IDriveFile, validateFileName } from '../../models/drive-file';
import { addFile } from './add-file';
import { IUser } from '../../models/user';
import * as mongodb from 'mongodb';
import { driveLogger } from './logger';
import { createTemp } from '../../misc/create-temp';
import { downloadUrl } from '../../misc/download-url';

const logger = driveLogger.createSubLogger('downloader');

type Args = {
	url: string;
	user: IUser;
	folderId?: mongodb.ObjectID | null;
	uri?: string | null;
	sensitive?: boolean;
	force?: boolean;
	isLink?: boolean;
	apId?: string | null;
}

export async function uploadFromUrl({
	url,
	user,
	folderId = null,
	uri = null,
	sensitive = false,
	force = false,
	isLink = false,
	apId = null,
}: Args): Promise<IDriveFile> {
	// Create temp file
	const [path, cleanup] = await createTemp();

	// write content at URL to temp file
	await downloadUrl(url, path);

	let name: string | null = null;

	name = new URL(url).pathname.split('/').pop() || null;

	if (name && !validateFileName(name)) {
		name = null;
	}

	let driveFile: IDriveFile | null = null;
	let error;

	try {
		driveFile = await addFile({ user, path, name, folderId, force, isLink, url, uri, sensitive, apId });
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

	if (error || !driveFile) {
		throw error;
	} else {
		return driveFile;
	}
}
