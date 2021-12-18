import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import { pack as packFolder } from './drive-folder';
import { pack as packUser } from './user';
import db, { nativeDbConn } from '../db/mongodb';
import isObjectId from '../misc/is-objectid';
import getDriveFileUrl, { getOriginalUrl } from '../misc/get-drive-file-url';
import { dbLogger } from '../db/logger';

const DriveFile = db.get<IDriveFile>('driveFiles.files');
DriveFile.createIndex('md5');
DriveFile.createIndex('metadata.uri');
DriveFile.createIndex('metadata.userId');
DriveFile.createIndex('metadata.folderId');
DriveFile.createIndex('metadata._user.host');
export default DriveFile;

export const DriveFileChunk = db.get('driveFiles.chunks');

export const getDriveFileBucket = async (): Promise<mongo.GridFSBucket> => {
	const db = await nativeDbConn();
	const bucket = new mongo.GridFSBucket(db, {
		bucketName: 'driveFiles'
	});
	return bucket;
};

export type IDriveFile = {
	_id: mongo.ObjectID;
	uploadDate: Date;
	md5: string;
	filename: string;
	contentType: string;
	animation?: 'yes' | 'no';
	metadata?: IMetadata;

	/**
	 * ファイルサイズ
	 */
	length: number;
};

export type IMetadata = {
	properties?: IProperties;
	userId: mongo.ObjectID;
	_user: any;
	folderId: mongo.ObjectID;
	comment: string;

	/**
	 * リモートインスタンスから取得した場合の元URL
	 */
	uri?: string;

	/**
	 * URL for web(生成されている場合) or original
	 * * オブジェクトストレージを利用している or リモートサーバーへの直リンクである 場合のみ
	 */
	url?: string;

	/**
	 * URL for thumbnail (thumbnailがなければなし)
	 * * オブジェクトストレージを利用している or リモートサーバーへの直リンクである 場合のみ
	 */
	thumbnailUrl?: string;

	/**
	 * URL for original (web用が生成されてない場合はurlがoriginalを指す)
	 * * オブジェクトストレージを利用している or リモートサーバーへの直リンクである 場合のみ
	 */
	webpublicUrl?: string;

	accessKey?: string;

	src?: string;
	deletedAt?: Date;

	/**
	 * このファイルの中身データがMongoDBまたはファイルシステム内に保存されていないか否か
	 * オブジェクトストレージを利用している or リモートサーバーへの直リンクである
	 * な場合は true になります
	 */
	withoutChunks?: boolean;
	fileSystem?: boolean;

	storage?: string;

	/***
	 * ObjectStorage の格納先の情報
	 */
	storageProps?: IStorageProps;
	isSensitive?: boolean;

	/**
	 * このファイルが添付された投稿のID一覧
	 */
	attachedNoteIds?: mongo.ObjectID[];

	/**
	 * 外部の(信頼されていない)URLへの直リンクか否か
	 */
	isRemote?: boolean;
};

export type IProperties = {
	width?: number;
	height?: number;
	webpublicWidth?: number;
	webpublicHeight?: number;
	webpublicLength?: number;
};

export type IStorageProps = {
	/**
	 * ObjectStorage key for original
	 */
	key: string;

	/***
	 * ObjectStorage key for thumbnail (thumbnailがなければなし)
	 */
	thumbnailKey?: string;

	/***
	 * ObjectStorage key for webpublic (webpublicがなければなし)
	 */
	webpublicKey?: string;

	id?: string;
};

export function validateFileName(name: string): boolean {
	return (
		(name.trim().length > 0) &&
		(name.length <= 200) &&
		(name.indexOf('\\') === -1) &&
		(name.indexOf('/') === -1) &&
		(name.indexOf('..') === -1)
	);
}

export const packMany = (
	files: any[],
	options?: {
		detail?: boolean
		self?: boolean,
		withUser?: boolean,
	}
) => {
	return Promise.all(files.map(f => pack(f, options)));
};

/**
 * Pack a drive file for API response
 */
export const pack = async (
	file: any,
	options?: {
		detail?: boolean,
		self?: boolean,
		withUser?: boolean,
	}
) => {
	const opts = Object.assign({
		detail: false,
		self: false
	}, options);

	let _file: any;

	// Populate the file if 'file' is ID
	if (isObjectId(file)) {
		_file = await DriveFile.findOne({
			_id: file
		});
	} else if (typeof file === 'string') {
		_file = await DriveFile.findOne({
			_id: new mongo.ObjectID(file)
		});
	} else {
		_file = deepcopy(file);
	}

	// (データベースの欠損などで)ファイルがデータベース上に見つからなかったとき
	if (_file == null) {
		dbLogger.warn(`[DAMAGED DB] (missing) pkg: driveFile :: ${file}`);
		return null;
	}

	// rendered target
	const _target: any = {};

	_target.id = _file._id;
	_target.createdAt = _file.uploadDate;
	_target.name = _file.filename;
	_target.type = _file.contentType;
	_target.animation = _file.animation;
	_target.datasize = _file.length;
	_target.size = _file.length;
	_target.md5 = _file.md5;

	_target.url = getDriveFileUrl(_file);
	_target.thumbnailUrl = getDriveFileUrl(_file, true);

	_target.properties = _file.metadata.properties || {};
	_target.comment = _file.metadata.comment;
	_target.deletedAt = _file.metadata.deletedAt;
	_target.isSensitive = _file.metadata.isSensitive;

	if (opts.detail) {
		_target.folderId = _file.metadata.folderId;

		if (_target.folderId) {
			// Populate folder
			_target.folder = await packFolder(_target.folderId, {
				detail: true
			});
		}

		/*
		if (_target.tags) {
			// Populate tags
			_target.tags = await _target.tags.map(async (tag: any) =>
				await serializeDriveTag(tag)
			);
		}
		*/
	}

	if (opts.withUser) {
		// Populate user
		_target.userId = _file.metadata.userId;
		_target.user = await packUser(_file.metadata.userId);
	}

	if (opts.self) {
		_target.webpublicUrl = _target.url;
		_target.url = getOriginalUrl(_file);
	}

	return _target;
};
