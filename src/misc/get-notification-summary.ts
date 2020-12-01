import getUserName from './get-user-name';
import getNoteSummary from './get-note-summary';
import getReactionEmoji from './get-reaction-emoji';

/**
 * 通知を表す文字列を取得します。
 * @param notification 通知
 */
export default function(notification: any): string {
	switch (notification.type) {
		case 'follow':
			return `Follow ${getUserName(notification.user)}`;
		case 'mention':
			return `Mention ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		case 'reply':
			return `Reply ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		case 'renote':
			return `Renote ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		case 'quote':
			return `Quote ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		case 'reaction':
			return `${getReactionEmoji(notification.reaction)} ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		case 'poll_vote':
			return `Vote ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		case 'poll_finished':
			return `poll_finished ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		case 'highlight':
			return `Highlight ${getUserName(notification.user)} ${getNoteSummary(notification.note)}`;
		default:
			return `Unknown ${notification.type}`;
	}
}
