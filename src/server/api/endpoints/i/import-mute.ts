import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import define from '../../define';
import { createImportMuteJob } from '../../../../queue';
import ms = require('ms');
import DriveFile from '../../../../models/drive-file';
import { ApiError } from '../../error';

export const meta = {
	secure: true,
	requireCredential: true,
	limit: {
		duration: ms('1hour'),
		max: 5,
	},

	params: {
		fileId: {
			validator: $.type(ID),
			transform: transform,
		}
	},

	errors: {
		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: '8b298b72-31bd-4fc0-b5f0-99d12a098d6c'
		},

		unexpectedFileType: {
			message: 'We need csv file.',
			code: 'UNEXPECTED_FILE_TYPE',
			id: 'cfa45c3f-ca95-48b2-bfd0-60210114fcba'
		},

		tooBigFile: {
			message: 'That file is too big.',
			code: 'TOO_BIG_FILE',
			id: 'd536adb5-2f96-4710-a108-bb8f9842f4f4'
		},

		emptyFile: {
			message: 'That file is empty.',
			code: 'EMPTY_FILE',
			id: 'e28e6b3f-8477-4e33-89a1-bd6379793f3d'
		},
	}
};

export default define(meta, async (ps, user) => {
	const file = await DriveFile.findOne({
		_id: ps.fileId,
		'metadata.userId': user._id,
	});

	if (file == null) throw new ApiError(meta.errors.noSuchFile);
	//if (!file.contentType.endsWith('/csv')) throw new ApiError(meta.errors.unexpectedFileType);
	if (file.length > 50000) throw new ApiError(meta.errors.tooBigFile);
	if (file.length === 0) throw new ApiError(meta.errors.emptyFile);

	createImportMuteJob(user, file._id);

	return;
});
