import getNoteSummary from '../../../../misc/get-note-summary';
import getReactionEmoji from '../../../../misc/get-reaction-emoji';
import getUserName from '../../../../misc/get-user-name';
import { PackedNotification } from '../../../../models/packed-schemas';

type Notification = {
	title: string;
	body: string;
	icon: string;
	onclick?: any;
};

// TODO: i18n

export default function(type, data): Notification {
	switch (type) {
		case 'driveFileCreated':
			return {
				title: 'File uploaded',
				body: data.name,
				icon: data.url
			};

		case 'unreadMessagingMessage':
			return {
				title: `New message from ${getUserName(data.user)}`,
				body: data.text,
				icon: data.user.avatarUrl
			};

		case 'reversiInvited':
			return {
				title: 'Play reversi with me',
				body: `You got reversi invitation from ${getUserName(data.parent)}`,
				icon: data.parent.avatarUrl
			};

		case 'notification':
			const notification = data as PackedNotification;
			switch (notification.type) {
				case 'follow':
					return {
						title: `Followed by ${getUserName(notification.user)}`,
						body: '',
						icon: notification.user.avatarUrl
					};

				case 'mention':
					return {
						title: `Mention from ${getUserName(notification.user)}`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'reply':
					return {
						title: `Reply from ${getUserName(notification.user)}`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'renote':
					return {
						title: `Renoted by ${getUserName(notification.user)}`,
						body: getNoteSummary(notification.note.renote),
						icon: notification.user.avatarUrl
					};

				case 'quote':
					return {
						title: `Quoted by ${getUserName(notification.user)}`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'reaction':
					return {
						title: `${getReactionEmoji(notification.reaction)} from ${getUserName(notification.user)}`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'poll_vote':
					return {
						title: `Voted by ${getUserName(notification.user)}`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'poll_finished':
					return {
						title: `Poll finished`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				case 'receiveFollowRequest':
					return {
						title: `Follow request from ${getUserName(notification.user)}`,
						body: '',
						icon: notification.user.avatarUrl
					};

				case 'highlight':
					return {
						title: `Highlighte: ${getUserName(notification.user)}`,
						body: getNoteSummary(notification.note),
						icon: notification.user.avatarUrl
					};

				default:
					return {
						title: `${getUserName(notification.user)}`,
						body: notification.type,
						icon: notification.user.avatarUrl
					};
			}

		default:
			return null;
	}
}
