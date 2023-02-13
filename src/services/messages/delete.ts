import User, { isLocalUser } from '../../models/user';
import MessagingMessage, { IMessagingMessage } from '../../models/messaging-message';
import { publishMessagingStream } from '../stream';
import DriveFile from '../../models/drive-file';

export async function deleteMessage(message: IMessagingMessage) {
	await MessagingMessage.remove({ _id: message._id });
	postDeleteMessage(message);
}

async function postDeleteMessage(message: IMessagingMessage) {
	const user = await User.findOne({ _id: message.userId});
	const recipient = await User.findOne({ _id: message.recipientId});
	if (user == null || recipient == null) return;

	if (isLocalUser(user)) {
		publishMessagingStream(user._id, message.recipientId, 'deleted', message._id);
	}

	if (isLocalUser(recipient)) {
		publishMessagingStream(recipient._id, message.userId, 'deleted', message._id);
	}

	// ファイルが添付されていた場合ドライブのファイルの「このファイルが添付されたチャットメッセージ一覧」プロパティからこの投稿を削除
	if (message.fileId) {
		DriveFile.update({ _id: message.fileId }, {
			$pull: {
				'metadata.attachedMessageIds': message._id
			}
		});
	}
}
