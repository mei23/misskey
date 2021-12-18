import { PackedNotification, PackedNote } from '../../../models/packed-schemas';

export type MainStreamEvent = MainStreamNotificationEvent | MainStreamMentionEvent;

export type MainStreamNotificationEvent = {
	type: 'notification';
	body: PackedNotification;
};

export type MainStreamMentionEvent = {
	type: 'mention';
	body: PackedNote;
};
