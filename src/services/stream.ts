import * as mongo from 'mongodb';
import redis from '../db/redis';
import config from '../config';
import { PackedNote, PackedNotification, PackedUser, ThinPackedUser } from '../models/packed-schemas';

type ID = string | mongo.ObjectID;

export type PubSubMessage<T> = {
	type: string;
	body: T | null;
}

export type NoteStreamBody = {
	/** Note id */
	id: string;
	body: unknown;
};

function publish(channel: string, type: string | null, value?: unknown): void {
	const message: PubSubMessage<unknown> | unknown = type == null ? value : value == null ?
		{ type: type, body: null } :
		{ type: type, body: value };

	redis!.publish(config.host, JSON.stringify({
		channel: channel,
		message: message
	}));
}

export function publishMainStream(userId: ID, type: 'notification' | 'unreadNotification', value: PackedNotification): void;
export function publishMainStream(userId: ID, type: 'reply' | 'renote' | 'mention', value: PackedNote): void;
export function publishMainStream(userId: ID, type: 'unreadMention' | 'unreadSpecifiedNote', value: ID): void;
export function publishMainStream(userId: ID, type: 'meUpdated', value: PackedUser): void;
export function publishMainStream(userId: ID, type: 'followed', value: PackedUser): void;
export function publishMainStream(userId: ID, type: 'follow' | 'unfollow' | 'receiveFollowRequest', value: ThinPackedUser): void;
export function publishMainStream(userId: ID, type: 'reversiInvited', value: any): void;
export function publishMainStream(userId: ID, type: 'homeUpdated' | 'mobileHomeUpdated' | 'widgetUpdated', value: any): void;
export function publishMainStream(userId: ID, type: 'messagingMessage', value: any): void;
export function publishMainStream(userId: ID, type: 'driveFileCreated', value: any): void;
export function publishMainStream(userId: ID, type: 'clientSettingUpdated', value: any): void;
export function publishMainStream(userId: ID, type: 'signin', value: any): void;
export function publishMainStream(userId: ID, type: 'readAllMessagingMessages' | 'readAllNotifications' | 'readAllUnreadMentions' | 'readAllUnreadSpecifiedNotes' | 'myTokenRegenerated'): void;
export function publishMainStream(userId: ID, type: string, value?: unknown): void {
	publish(`mainStream:${userId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishDriveStream(userId: ID, type: string, value?: unknown): void {
	publish(`driveStream:${userId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishNoteStream(noteId: ID, type: string, value: unknown): void {
	publish(`noteStream:${noteId}`, type, {
		id: noteId,
		body: value
	} as NoteStreamBody);
}

export function publishUserListStream(listId: ID, type: string, value?: unknown): void {
	publish(`userListStream:${listId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishMessagingStream(userId: ID, otherpartyId: ID, type: string, value?: unknown): void {
	publish(`messagingStream:${userId}-${otherpartyId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishMessagingIndexStream(userId: ID, type: string, value?: unknown): void {
	publish(`messagingIndexStream:${userId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishReversiStream(userId: ID, type: string, value?: unknown): void {
	publish(`reversiStream:${userId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishReversiGameStream(gameId: ID, type: string, value?: unknown): void {
	publish(`reversiGameStream:${gameId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishNotesStream(note: PackedNote): void {
	publish('notesStream', null, note);
}

export function publishHotStream(note: PackedNote): void {
	publish(`hotStream`, null, note);
}

export function publishAdminStream(userId: ID, type: string, value?: unknown): void {
	publish(`adminStream:${userId}`, type, typeof value === 'undefined' ? null : value);
}

export function publishServerEvent(userId: ID | null, type: string, value?: unknown): void {
	const name = userId ? `serverEvent:${userId}` : `serverEvent`;
	publish(name, type, typeof value === 'undefined' ? null : value);
}
