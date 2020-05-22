import { IDriveFile } from '../models/drive-file';
import config from '../config';

export default function(file: IDriveFile, thumbnail = false, safety = false): string | null | undefined {
	if (file == null) return null;
	if (safety && file.metadata && file.metadata.isSensitive) return null;

	const isImage = file.contentType && ['image/png', 'image/apng', 'image/gif', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(file.contentType);

	if (file.metadata.withoutChunks && file.metadata.isRemote) {	// リモートの未格納ファイル => /files/ 下でProxy
		if (thumbnail) {
			return `${config.driveUrl}/${file._id}/${generateFilename(file, true)}?thumbnail`;
		} else {
			return `${config.driveUrl}/${file._id}/${generateFilename(file)}?web`;
		}
	} else if (file.metadata.withoutChunks) {	// オブジェクトストレージ格納分 => そのURL
		if (thumbnail) {
			return file.metadata.thumbnailUrl || file.metadata.webpublicUrl || (isImage ? file.metadata.url : null);
		} else {
			return file.metadata.webpublicUrl || file.metadata.url;
		}
	} else {	// DB/File格納分 => /files/ 下で送出
		if (thumbnail) {
			return `${config.driveUrl}/${file._id}/${generateFilename(file, true)}?thumbnail`;
		} else {
			return `${config.driveUrl}/${file._id}/${generateFilename(file)}?web`;
		}
	}
}

/**
 * 拡張子付きのファイル名を生成する
 */
function generateFilename(file: IDriveFile, thumbnail = false) {
	let ext = '';

	if (thumbnail && file.contentType !== 'image/png') {
		ext = '.jpg';
	} else {
		if (file.filename) {
			[ext] = (file.filename.match(/\.(\w+)$/) || ['']);
		}

		if (ext === '' && file.contentType) {
			if (file.contentType === 'image/jpeg') ext = '.jpg';
			if (file.contentType === 'image/png') ext = '.png';
			if (file.contentType === 'image/webp') ext = '.webp';
		}
	}

	return `${file._id}${ext}`;
}

export function getOriginalUrl(file: IDriveFile) {
	if (file.metadata && file.metadata.url) {
		return file.metadata.url;
	}

	const accessKey = file.metadata ? file.metadata.accessKey : null;
	return `${config.driveUrl}/${file._id}${accessKey ? '?original=' + accessKey : ''}`;
}
