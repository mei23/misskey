import { ParsedSignature } from '@misskey-dev/node-http-message-signatures';
import { IActivity } from '../remote/activitypub/type';
import * as webpush from 'web-push';

export interface OldParsedSignature {
	scheme: 'Signature';
	params: {
		keyId: string;
		algorithm: string;
		headers: string[];
		signature: string;
	};
	signingString: string;
	algorithm: string;
	keyId: string;
};

export type ThinUser = {
	_id: string;
};

export type DeliverJobData = {
	/** Actor */
	user: ThinUser;
	/** Activity */
	content: string;
	/** Digest header */
	digest: string;
	/** inbox URL to deliver */
	to: string;
	/** Detail information of inbox */
	inboxInfo?: InboxInfo;
};

export type WebpushDeliverJobData = {
	swSubscriptionId: string;
	pushSubscription: webpush.PushSubscription;
	payload: string;
};

export type InboxInfo = {
	/** kind of inbox */
	origin: 'inbox' | 'sharedInbox';
	/** inbox or sharedInbox URL to deliver */
	url: string;
	/** userId (in case of origin=inbox) */
	userId?: string;
};

export type InboxJobData = {
	activity: IActivity;
	signature: ParsedSignature | OldParsedSignature;
	request?: InboxRequestData;
};

export type InboxRequestData = {
	ip?: string;
};

export type DbJobData = DbUserJobData | DbUserImportJobData | DeleteNoteJobData | NotifyPollFinishedJobData | ExpireMuteJobData;

export type DbUserJobData = {
	user: ThinUser;
};

export type DbUserImportJobData = {
	user: ThinUser;
	fileId: string;
};

export type DeleteNoteJobData = {
	noteId: string;
};

export type NotifyPollFinishedJobData = {
	userId: string;	// ObjectIDを入れてもstringでシリアライズされるだけ
	noteId: string;
}

export type ExpireMuteJobData = {
	muteId: string;
}
