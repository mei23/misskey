import { IDriveFile } from '../../../models/drive-file';
import getDriveFileUrl from '../../../misc/get-drive-file-url';
import config from '../../../config';

export default (file: IDriveFile) => ({
	id: `${config.url}/activitypub/documents/${file._id}`,
	type: 'Image',
	mediaType: file.contentType,
	sensitive: !!file.metadata?.isSensitive,
	url: getDriveFileUrl(file)
});
