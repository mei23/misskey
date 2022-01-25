import * as fs from 'fs';

import * as mongodb from 'mongodb';

import DriveFile, { IMetadata, getDriveFileBucket, IDriveFile, IProperties } from '../../models/drive-file';
import DriveFolder from '../../models/drive-folder';
import { pack } from '../../models/drive-file';
import { publishMainStream, publishDriveStream } from '../stream';
import { isLocalUser, IUser, IRemoteUser, isRemoteUser } from '../../models/user';
import delFile from './delete-file';
import { getDriveFileWebpublicBucket } from '../../models/drive-file-webpublic';
import { getDriveFileThumbnailBucket } from '../../models/drive-file-thumbnail';
import driveChart from '../../services/chart/drive';
import perUserDriveChart from '../../services/chart/per-user-drive';
import instanceChart from '../../services/chart/instance';
import fetchMeta from '../../misc/fetch-meta';
import { generateVideoThumbnail } from './generate-video-thumbnail';
import { driveLogger } from './logger';
import { IImage, convertSharpToJpeg, convertSharpToWebp, convertSharpToPng, convertSharpToPngOrJpeg } from './image-processor';
import Instance from '../../models/instance';
import { contentDisposition } from '../../misc/content-disposition';
import { getFileInfo, FileInfo, FILE_TYPE_BROWSERSAFE } from '../../misc/get-file-info';
import { DriveConfig } from '../../config/types';
import { getDriveConfig } from '../../misc/get-drive-config';
import * as S3 from 'aws-sdk/clients/s3';
import { getS3 } from './s3';
import * as sharp from 'sharp';
import { genFid } from '../../misc/id/fid';
import { InternalStorage } from './internal-storage';

const logger = driveLogger.createSubLogger('register', 'yellow');

/***
 * Save file
 * @param path Path for original
 * @param name Name for original
 * @param info FileInfo
 * @param metadata
 */
async function save(path: string, name: string, info: FileInfo, metadata: IMetadata, drive: DriveConfig): Promise<IDriveFile> {
	// thunbnail, webpublic を必要なら生成
	let animation = info.type.mime === 'image/apng' ? 'yes' : info.type.mime === 'image/png' ? 'no' : undefined;

	const alts = await generateAlts(path, info.type.mime, !metadata.uri).catch(err => {
		if (err === 'ANIMATED') {
			animation = 'yes';
		} else {
			logger.error(err);
		}

		return {
			webpublic: null,
			thumbnail: null
		};
	});


	if (info.type.mime === 'image/apng') info.type.mime = 'image/png';

	if (drive.storage == 'minio') {
		//#region ObjectStorage params
		const ext = (info.type.ext && FILE_TYPE_BROWSERSAFE.includes(info.type.mime)) ? `.${info.type.ext}` : '';

		const baseUrl = drive.baseUrl
			|| `${ drive.config!.useSSL ? 'https' : 'http' }://${ drive.config!.endPoint }${ drive.config!.port ? `:${drive.config!.port}` : '' }/${ drive.bucket }`;

		// for original
		const key = `${drive.prefix}/${genFid()}${ext}`;
		const url = `${ baseUrl }/${ key }`;

		// for alts
		let webpublicKey: string | null = null;
		let webpublicUrl: string | null = null;
		let thumbnailKey: string | null = null;
		let thumbnailUrl: string | null = null;
		//#endregion

		//#region Uploads
		logger.info(`uploading original: ${key}`);
		const uploads = [
			upload(key, fs.createReadStream(path), info.type.mime, name, drive)
		];

		if (alts.webpublic) {
			webpublicKey = `${drive.prefix}/${genFid()}.${alts.webpublic.ext}`;
			webpublicUrl = `${ baseUrl }/${ webpublicKey }`;

			logger.info(`uploading webpublic: ${webpublicKey}`);
			uploads.push(upload(webpublicKey, alts.webpublic.data, alts.webpublic.type, null, drive));
		}

		if (alts.thumbnail) {
			thumbnailKey = `${drive.prefix}/${genFid()}.${alts.thumbnail.ext}`;
			thumbnailUrl = `${ baseUrl }/${ thumbnailKey }`;

			logger.info(`uploading thumbnail: ${thumbnailKey}`);
			uploads.push(upload(thumbnailKey, alts.thumbnail.data, alts.thumbnail.type, null, drive));
		}

		await Promise.all(uploads);
		//#endregion

		//#region DB
		Object.assign(metadata, {
			withoutChunks: true,
			storage: 'minio',
			storageProps: {
				key,
				webpublicKey,
				thumbnailKey,
			},
			url,
			webpublicUrl,
			thumbnailUrl,
		} as IMetadata);

		const file = await DriveFile.insert({
			length: info.size,
			uploadDate: new Date(),
			md5: info.md5,
			filename: name,
			metadata: metadata,
			contentType: info.type.mime,
			animation
		});
		//#endregion

		return file;
	} else if (drive.storage == 'fs') {

		const key = `${genFid()}`;
		InternalStorage.saveFromPath(key, path);

		let webpublicKey: string | null = null;
		let thumbnailKey: string | null = null;

		if (alts.webpublic) {
			webpublicKey = `${genFid()}`;
			InternalStorage.saveFromBuffer(webpublicKey, alts.webpublic.data);
		}

		if (alts.thumbnail) {
			thumbnailKey = `${genFid()}`;
			InternalStorage.saveFromBuffer(thumbnailKey, alts.thumbnail.data);
		}

		//#region DB
		Object.assign(metadata, {
			withoutChunks: false,
			storage: 'fs',
			storageProps: {
				key,
				webpublicKey,
				thumbnailKey,
			},
			fileSystem: true
		} as IMetadata);

		// web用(Exif削除済み)がある場合はオリジナルにアクセス制限
		if (alts.webpublic) metadata.accessKey = genFid();

		const file = await DriveFile.insert({
			length: info.size,
			uploadDate: new Date(),
			md5: info.md5,
			filename: name,
			metadata: metadata,
			contentType: info.type.mime,
			animation
		});
		//#endregion

		return file;
	} else {	// use MongoDB GridFS
		// #region store original
		const originalDst = await getDriveFileBucket();

		// web用(Exif削除済み)がある場合はオリジナルにアクセス制限
		if (alts.webpublic) metadata.accessKey = genFid();

		const originalFile = await storeOriginal(originalDst, name, path, info.type.mime, metadata);

		logger.info(`original stored to ${originalFile._id}`);
		// #endregion store original

		// #region store webpublic
		if (alts.webpublic) {
			const webDst = await getDriveFileWebpublicBucket();
			const webFile = await storeAlts(webDst, name, alts.webpublic.data, alts.webpublic.type, originalFile._id);
			logger.info(`web stored ${webFile._id}`);
		}
		// #endregion store webpublic

		if (alts.thumbnail) {
			const thumDst = await getDriveFileThumbnailBucket();
			const thumFile = await storeAlts(thumDst, name, alts.thumbnail.data, alts.thumbnail.type, originalFile._id);
			logger.info(`web stored ${thumFile._id}`);
		}

		return originalFile;
	}
}

/**
 * Generate webpublic, thumbnail, etc
 * @param path Path for original
 * @param type Content-Type for original
 * @param generateWeb Generate webpublic or not
 */
export async function generateAlts(path: string, type: string, generateWeb: boolean) {
	// video
	if (type.startsWith('video/')) {
		const thumbnail = await generateVideoThumbnail(path);
		return {
			webpublic: null,
			thumbnail,
		};
	}

	// unsupported image
	if (!['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'].includes(type)) {
		return {
			webpublic: null,
			thumbnail: null
		};
	}

	const img = sharp(path);
	const metadata = await img.metadata();
	const isAnimated = metadata.pages && metadata.pages > 1;

	// skip animated
	if (isAnimated) {
		throw 'ANIMATED';
	}

	// #region webpublic
	let webpublic: IImage | null = null;

	const webpulicSafe = !metadata.exif && !metadata.iptc && !metadata.xmp && !metadata.tifftagPhotoshop	// has meta
		&& metadata.width && metadata.width <= 2048 && metadata.height && metadata.height <= 2048;	// or over 2048

	if (generateWeb) {
		logger.debug(`creating web image`);

		if (['image/jpeg'].includes(type) && !webpulicSafe) {
			webpublic = await convertSharpToJpeg(img, 2048, 2048);
		} else if (['image/webp'].includes(type) && !webpulicSafe) {
			webpublic = await convertSharpToWebp(img, 2048, 2048);
		} else if (['image/png'].includes(type) && !webpulicSafe) {
			webpublic = await convertSharpToPng(img, 2048, 2048);
		} else if (['image/svg+xml'].includes(type)) {
			webpublic = await convertSharpToPng(img, 2048, 2048);
		} else {
			logger.debug(`web image not created (not an image)`);
		}
	} else {
		logger.debug(`web image not created (from remote or resized)`);
	}
	// #endregion webpublic

	// #region thumbnail
	let thumbnail: IImage | null = null;

	if (['image/jpeg', 'image/webp'].includes(type)) {
		thumbnail = await convertSharpToJpeg(img, 530, 255);
	} else if (['image/png', 'image/svg+xml'].includes(type)) {
		thumbnail = await convertSharpToPngOrJpeg(img, 530, 255);
	}
	// #endregion thumbnail

	return {
		webpublic,
		thumbnail,
	};
}

/**
 * Upload to ObjectStorage
 */
async function upload(key: string, stream: fs.ReadStream | Buffer, type: string, filename: string | null, drive: DriveConfig) {
	if (!FILE_TYPE_BROWSERSAFE.includes(type)) type = 'application/octet-stream';

	const params = {
		Bucket: drive.bucket,
		Key: key,
		Body: stream,
		ContentType: type,
		CacheControl: 'max-age=2592000, s-maxage=172800, immutable',
	} as S3.PutObjectRequest;

	if (filename) params.ContentDisposition = contentDisposition('inline', filename);
	if (drive.config?.setPublicRead) params.ACL = 'public-read';

	const s3 = getS3(drive);

	const upload = s3.upload(params, {
		partSize: s3.endpoint?.hostname === 'storage.googleapis.com' ? 500 * 1024 * 1024 : 8 * 1024 * 1024
	});

	const result = await upload.promise();
	if (result) logger.debug(`Uploaded: ${result.Bucket}/${result.Key} => ${result.Location}`);
}

/**
 * GridFSBucketにオリジナルを格納する
 */
export async function storeOriginal(bucket: mongodb.GridFSBucket, name: string, path: string, contentType: string, metadata: any) {
	return new Promise<IDriveFile>((resolve, reject) => {
		const writeStream = bucket.openUploadStream(name, {
			contentType,
			metadata
		});

		writeStream.once('finish', resolve);
		writeStream.on('error', reject);
		fs.createReadStream(path).pipe(writeStream);
	});
}

/**
 * GridFSBucketにオリジナル以外を格納する
 */
export async function storeAlts(bucket: mongodb.GridFSBucket, name: string, data: Buffer, contentType: string, originalId: mongodb.ObjectID) {
	return new Promise<IDriveFile>((resolve, reject) => {
		const writeStream = bucket.openUploadStream(name, {
			contentType,
			metadata: {
				originalId
			}
		});

		writeStream.once('finish', resolve);
		writeStream.on('error', reject);
		writeStream.end(data);
	});
}

async function deleteOldFile(user: IRemoteUser) {
	const oldFile = await DriveFile.findOne({
		_id: {
			$nin: [user.avatarId, user.bannerId]
		},
		'metadata.userId': user._id,
		'metadata.deletedAt': { $exists: false },
	}, {
		sort: {
			_id: 1
		}
	});

	if (oldFile) {
		delFile(oldFile, true);
	}
}

type AddFileArgs = {
	/** User who wish to add file */
	user: IUser;
	/**  File path */
	path: string;
	/** Name */
	name?: string | null;
	/** Comment */
	comment?: string | null;
	/** Folder ID */
	folderId?: mongodb.ObjectID | null;
	/** If set to true, forcibly upload the file even if there is a file with the same hash. */
	force?: boolean;
	/** Do not save file to local */
	isLink?: boolean;
	/** URL of source (URLからアップロードされた場合(ローカル/リモート)の元URL) */
	url?: string | null;
	/** URL of source (リモートインスタンスのURLからアップロードされた場合の元URL) */
	uri?: string | null;
	/** CommMark file as sensitiveent */
	sensitive?: boolean;
}

/**
 * Add file to drive
 *
 */
export async function addFile({
	user,
	path,
	name = null,
	comment = null,
	folderId = null,
	force = false,
	isLink = false,
	url = null,
	uri = null,
	sensitive = false,
}: AddFileArgs): Promise<IDriveFile> {
	const info = await getFileInfo(path);
	logger.info(`${JSON.stringify(info)}`);

	// detect name
	const detectedName = name || (info.type.ext ? `untitled.${info.type.ext}` : 'untitled');

	if (!force) {
		// Check if there is a file with the same hash
		const much = await DriveFile.findOne({
			md5: info.md5,
			'metadata.userId': user._id,
			'metadata.deletedAt': { $exists: false }
		});

		if (much) {
			logger.info(`file with same hash is found: ${much._id}`);
			return much;
		}
	}

	//#region Check drive usageisRemote
	if (!isLink) {
		const usage = await DriveFile
			.aggregate([{
				$match: {
					'metadata.userId': user._id,
					'metadata.deletedAt': { $exists: false }
				}
			}, {
				$project: {
					length: true
				}
			}, {
				$group: {
					_id: null,
					usage: { $sum: '$length' }
				}
			}])
			.then((aggregates: any[]) => {
				if (aggregates.length > 0) {
					return aggregates[0].usage;
				}
				return 0;
			});

		logger.debug(`drive usage is ${usage}`);

		const instance = await fetchMeta();
		const driveCapacity = 1024 * 1024 * (isLocalUser(user) ? (instance.localDriveCapacityMb || 0) : (instance.remoteDriveCapacityMb || 0));

		// If usage limit exceeded
		if (usage + info.size > driveCapacity) {
			if (isLocalUser(user)) {
				throw 'no-free-space';
			} else {
				// (アバターまたはバナーを含まず)最も古いファイルを削除する
				deleteOldFile(user);
			}
		}
	}
	//#endregion

	const fetchFolder = async () => {
		if (!folderId) {
			return null;
		}

		const driveFolder = await DriveFolder.findOne({
			_id: folderId,
			userId: user._id
		});

		if (driveFolder == null) throw 'folder-not-found';

		return driveFolder;
	};

	const properties: IProperties = {};

	if (info.width) {
		properties['width'] = info.width;
		properties['height'] = info.height;
	}

	const folder = await fetchFolder();

	const metadata = {
		userId: user._id,
		_user: {
			host: user.host
		},
		folderId: folder !== null ? folder._id : null,
		comment: comment,
		properties: properties,
		withoutChunks: isLink,
		isRemote: isLink,
		isSensitive: (isLocalUser(user) && user.settings?.alwaysMarkNsfw) || sensitive
	} as IMetadata;

	if (url !== null) {
		metadata.src = url;

		if (isLink) {
			metadata.url = url;
		}
	}

	if (uri !== null) {
		metadata.uri = uri;
	}

	let driveFile: IDriveFile | undefined;

	if (isLink) {
		try {
			driveFile = await DriveFile.insert({
				length: 0,
				uploadDate: new Date(),
				md5: info.md5,
				filename: detectedName,
				metadata: metadata,
				contentType: info.type.mime
			});
		} catch (e) {
			// duplicate key error (when already registered)
			if (e.code === 11000) {
				logger.info(`already registered ${metadata.uri}`);

				driveFile = await DriveFile.findOne({
					'metadata.uri': metadata.uri,
					'metadata.userId': user._id
				});
			} else {
				logger.error(e);
				throw e;
			}
		}
	} else {
		const drive = getDriveConfig(uri != null);
		driveFile = await (save(path, detectedName, info, metadata, drive));
	}

	if (!driveFile) throw 'Failed to create drivefile ${e}';

	logger.succ(`drive file has been created ${driveFile._id}`);

	pack(driveFile, { self: true }).then(packedFile => {
		// Publish driveFileCreated event
		publishMainStream(user._id, 'driveFileCreated', packedFile);
		publishDriveStream(user._id, 'fileCreated', packedFile);
	});

	// 統計を更新
	driveChart.update(driveFile, true);
	perUserDriveChart.update(driveFile, true);
	if (isRemoteUser(driveFile.metadata?._user)) {
		instanceChart.updateDrive(driveFile, true);
		Instance.update({ host: driveFile.metadata!._user.host }, {
			$inc: {
				driveUsage: driveFile.length,
				driveFiles: 1
			}
		});
	}
	return driveFile;
}
