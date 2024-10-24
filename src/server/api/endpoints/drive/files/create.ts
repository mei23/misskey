import * as ms from 'ms';
import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import { validateFileName, pack } from '../../../../../models/drive-file';
import { FileTypeError, addFile } from '../../../../../services/drive/add-file';
import define from '../../../define';
import { apiLogger } from '../../../logger';
import { ApiError } from '../../../error';

export const meta = {
	desc: {
		'ja-JP': 'ドライブにファイルをアップロードします。',
		'en-US': 'Upload a file to drive.'
	},

	tags: ['drive'],

	requireCredential: true,

	limit: {
		duration: ms('1hour'),
		max: 120
	},

	requireFile: true,

	kind: ['write:drive', 'drive-write'],

	params: {
		folderId: {
			validator: $.optional.nullable.type(ID),
			transform: transform,
			default: null as any,
			desc: {
				'ja-JP': 'フォルダID'
			}
		},

		name: {
			validator: $.optional.nullable.str,
			default: null as any,
			desc: {
				'ja-JP': 'ファイル名（拡張子があるなら含めて）'
			}
		},

		isSensitive: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'このメディアが「閲覧注意」(NSFW)かどうか',
				'en-US': 'Whether this media is NSFW'
			}
		},

		force: {
			validator: $.optional.bool,
			default: false,
			desc: {
				'ja-JP': 'true にすると、同じハッシュを持つファイルが既にアップロードされていても強制的にファイルを作成します。',
			}
		},
	},

	res: {
		type: 'DriveFile',
	},

	errors: {
		invalidFileName: {
			message: 'Invalid file name.',
			code: 'INVALID_FILE_NAME',
			id: 'f449b209-0c60-4e51-84d5-29486263bfd4'
		},

		unsupportedFileTypeHeic: {
			message: 'Unsupported file type. HEIC',
			code: 'UNSUPPORTED_FILE_TYPE_HEIC',
			id: 'c5384862-bc35-4d0f-9493-ba45ec96115d'
		},
	}
};

export default define(meta, async (ps, user, app, file, cleanup) => {
	// Get 'name' parameter
	let name = ps.name || file.originalname;
	if (name !== undefined && name !== null) {
		name = name.trim();
		if (name.length === 0) {
			name = null;
		} else if (name === 'blob') {
			name = null;
		} else if (!validateFileName(name)) {
			throw new ApiError(meta.errors.invalidFileName);
		}
	} else {
		name = null;
	}

	try {
		const driveFile = await addFile({ user, path: file.path, name, folderId: ps.folderId, force: ps.force, sensitive: ps.isSensitive });
		return pack(driveFile, { detail: true, self: true });
	} catch (e) {
		if (e instanceof FileTypeError) {
			if (e.type === 'denyHeic') throw new ApiError(meta.errors.unsupportedFileTypeHeic);
		}
		apiLogger.error(e);
		throw new ApiError();
	} finally {
		cleanup();
	}
});
