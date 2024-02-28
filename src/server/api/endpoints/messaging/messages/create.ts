import $ from 'cafy';
import ID, { transform } from '../../../../../misc/cafy-id';
import { isValidText } from '../../../../../models/messaging-message';
import DriveFile from '../../../../../models/drive-file';
import define from '../../../define';
import { ApiError } from '../../../error';
import { GetterError, getUser } from '../../../common/getters';
import { createMessage } from '../../../../../services/messages/create';
import { isRemoteUser, IUser } from '../../../../../models/user';

export const meta = {
	desc: {
		'ja-JP': '指定したユーザーへMessagingのメッセージを送信します。',
		'en-US': 'Create a message of messaging.'
	},

	tags: ['messaging'],

	requireCredential: true,

	kind: ['write:messaging', 'messaging-write'],

	params: {
		userId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},

		text: {
			validator: $.optional.str.pipe(isValidText)
		},

		fileId: {
			validator: $.optional.type(ID),
			transform: transform,
		}
	},

	res: {
		type: 'MessagingMessage',
	},

	errors: {
		recipientIsYourself: {
			message: 'You can not send a message to yourself.',
			code: 'RECIPIENT_IS_YOURSELF',
			id: '17e2ba79-e22a-4cbc-bf91-d327643f4a7e'
		},

		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: '11795c64-40ea-4198-b06e-3c873ed9039d'
		},

		remoteNotSupported: {
			message: 'Remote not supported.',
			code: 'REMOTE_NOT_SUPPORTED',
			id: '02a6703e-fa13-449b-b792-5512ccc0ece0'
		},

		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: '4372b8e2-185d-4146-8749-2f68864a3e5f'
		},

		contentRequired: {
			message: 'Content required. You need to set text or fileId.',
			code: 'CONTENT_REQUIRED',
			id: '25587321-b0e6-449c-9239-f8925092942c'
		}
	}
};

export default define(meta, async (ps, user) => {
	// Myself
	if (ps.userId.equals(user._id)) {
		throw new ApiError(meta.errors.recipientIsYourself);
	}

	// Fetch recipient
	const recipient = await getUser(ps.userId).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchUser') throw new ApiError(meta.errors.noSuchUser);
		throw e;
	});

	// Remote
	if (isRemoteUser(recipient)) {
		throw new ApiError(meta.errors.remoteNotSupported);
	}


	let file = null;
	if (ps.fileId != null) {
		file = await DriveFile.findOne({
			_id: ps.fileId,
			'metadata.userId': user._id
		});

		if (file === null) {
			throw new ApiError(meta.errors.noSuchFile);
		}
	}

	// テキストが無いかつ添付ファイルも無かったらエラー
	if (ps.text == null && file == null) {
		throw new ApiError(meta.errors.contentRequired);
	}

	return await createMessage(user, recipient, ps.text, file);
});
