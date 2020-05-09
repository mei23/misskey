import User, { IUser, isRemoteUser, isLocalUser, getMute } from '../../models/user';
import { IDriveFile } from '../../models/drive-file';
import { publishMessagingStream, publishMessagingIndexStream, publishMainStream } from '../stream';
import MessagingMessage, { pack as packMessage } from '../../models/messaging-message';
import pushNotification from '../push-notification';
import { INote } from '../../models/note';
import renderNote from '../../remote/activitypub/renderer/note';
import renderCreate from '../../remote/activitypub/renderer/create';
import { renderActivity } from '../../remote/activitypub/renderer';
import { deliver } from '../../queue';

export async function createMessage(user: IUser, recipient: IUser, text: string, file: IDriveFile, uri?: string) {
	const message = await MessagingMessage.insert({
		createdAt: new Date(),
		fileId: file ? file._id : undefined,
		recipientId: recipient._id,
		text: text ? text.trim() : undefined,
		userId: user._id,
		isRead: false,
		uri,
	});

	const messageObj = await packMessage(message);

	if (isLocalUser(user)) {
		// 自分のストリーム
		publishMessagingStream(message.userId, message.recipientId, 'message', messageObj);
		publishMessagingIndexStream(message.userId, 'message', messageObj);
		publishMainStream(message.userId, 'messagingMessage', messageObj);
	}

	if (isLocalUser(recipient)) {
		// 相手のストリーム
		publishMessagingStream(message.recipientId, message.userId, 'message', messageObj);
		publishMessagingIndexStream(message.recipientId, 'message', messageObj);
		publishMainStream(message.recipientId, 'messagingMessage', messageObj);

		// Update flag
		User.update({ _id: recipient._id }, {
			$set: {
				hasUnreadMessagingMessage: true
			}
		});

		// 2秒経っても(今回作成した)メッセージが既読にならなかったら「未読のメッセージがありますよ」イベントを発行する
		setTimeout(async () => {
			const freshMessage = await MessagingMessage.findOne({ _id: message._id }, { isRead: true });
			if (freshMessage == null) return; // メッセージが削除されている場合もある
			if (!freshMessage.isRead) {
				//#region ただしミュートされているなら発行しない
				const mute = await getMute(recipient._id, user._id);
				if (mute) return;
				//#endregion

				publishMainStream(message.recipientId, 'unreadMessagingMessage', messageObj);
				pushNotification(message.recipientId, 'unreadMessagingMessage', messageObj);
			}
		}, 2000);
	}

	if (isLocalUser(user) && isRemoteUser(recipient)) {
		const note = {
			_id: message._id,
			createdAt: message.createdAt,
			fileIds: message.fileId ? [ message.fileId ] : [],
			text: message.text,
			userId: message.userId,
			visibility: 'specified',
			mentions: [ recipient ].map(u => u._id),
			mentionedRemoteUsers: [ {
				uri: recipient.uri,
				username: recipient.username,
				host: recipient.host
			} ],
		} as INote;

		const activity = renderActivity(renderCreate(await renderNote(note, false, true), note));

		deliver(user, activity, recipient.inbox);
	}

	return messageObj;
}
