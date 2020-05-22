import DriveFile, { DriveFileChunk, IDriveFile } from '../../models/drive-file';
import DriveFileThumbnail, { DriveFileThumbnailChunk } from '../../models/drive-file-thumbnail';
import driveChart from '../../services/chart/drive';
import perUserDriveChart from '../../services/chart/per-user-drive';
import instanceChart from '../../services/chart/instance';
import DriveFileWebpublic, { DriveFileWebpublicChunk } from '../../models/drive-file-webpublic';
import Instance from '../../models/instance';
import { isRemoteUser } from '../../models/user';
import { getDriveConfig } from '../../misc/get-drive-config';
import { getS3 } from './s3';
import { InternalStorage } from './internal-storage';

export default async function(file: IDriveFile, isExpired = false) {
	const drive = getDriveConfig(file.metadata && file.metadata.uri != null);

	if (file.metadata.storage == 'minio') {
		const s3 = getS3(drive);

		// 後方互換性のため、file.metadata.storageProps.key があるかどうかチェックしています。
		// 将来的には const obj = file.metadata.storageProps.key; とします。
		const obj = file.metadata.storageProps.key ? file.metadata.storageProps.key : `${drive.prefix}/${file.metadata.storageProps.id}`;
		await s3.deleteObject({
			Bucket: drive.bucket,
			Key: obj
		}).promise();

		if (file.metadata.thumbnailUrl) {
			// 後方互換性のため、file.metadata.storageProps.thumbnailKey があるかどうかチェックしています。
			// 将来的には const thumbnailObj = file.metadata.storageProps.thumbnailKey; とします。
			const thumbnailObj = file.metadata.storageProps.thumbnailKey ? file.metadata.storageProps.thumbnailKey : `${drive.prefix}/${file.metadata.storageProps.id}-thumbnail`;
			await s3.deleteObject({
				Bucket: drive.bucket,
				Key: thumbnailObj
			}).promise();
		}

		if (file.metadata.webpublicUrl) {
			const webpublicObj = file.metadata.storageProps.webpublicKey ? file.metadata.storageProps.webpublicKey : `${drive.prefix}/${file.metadata.storageProps.id}-original`;
			await s3.deleteObject({
				Bucket: drive.bucket,
				Key: webpublicObj
			}).promise();
		}
	}

	// チャンクをすべて削除
	await DriveFileChunk.remove({
		files_id: file._id
	});

	// fs削除
	if (file.metadata?.fileSystem) {
		if (file.metadata?.storageProps?.key) InternalStorage.del(file.metadata?.storageProps?.key);
		if (file.metadata?.storageProps?.thumbnailKey) InternalStorage.del(file.metadata?.storageProps?.thumbnailKey);
		if (file.metadata?.storageProps?.webpublicKey) InternalStorage.del(file.metadata?.storageProps?.webpublicKey);
	}

	const set = {
		metadata: {
			deletedAt: new Date(),
			isExpired: isExpired
		}
	} as any;

	// リモートファイル期限切れ削除後は直リンクにする
	if (isExpired && file.metadata && file.metadata._user && file.metadata._user.host != null) {
		set.metadata.withoutChunks = true;
		set.metadata.isRemote = true;
		set.metadata.url = file.metadata.uri;
		set.metadata.thumbnailUrl = undefined;
		set.metadata.webpublicUrl = undefined;
	}

	await DriveFile.update({ _id: file._id }, {
		$set: set
	});

	//#region サムネイルもあれば削除
	const thumbnail = await DriveFileThumbnail.findOne({
		'metadata.originalId': file._id
	});

	if (thumbnail) {
		await DriveFileThumbnailChunk.remove({
			files_id: thumbnail._id
		});

		await DriveFileThumbnail.remove({ _id: thumbnail._id });
	}
	//#endregion

	//#region Web公開用もあれば削除
	const webpublic = await DriveFileWebpublic.findOne({
		'metadata.originalId': file._id
	});

	if (webpublic) {
		await DriveFileWebpublicChunk.remove({
			files_id: webpublic._id
		});

		await DriveFileWebpublic.remove({ _id: webpublic._id });
	}
	//#endregion

	// 統計を更新
	driveChart.update(file, false);
	perUserDriveChart.update(file, false);
	if (isRemoteUser(file.metadata._user)) {
		instanceChart.updateDrive(file, false);
		Instance.update({ host: file.metadata._user.host }, {
			$inc: {
				driveUsage: -file.length,
				driveFiles: -1
			}
		});
	}
}
