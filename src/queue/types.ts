import { ObjectID } from 'mongodb';
import * as httpSignature from 'http-signature';
import { ILocalUser } from '../models/user';
import { IActivity } from '../remote/activitypub/type';

export type DeliverJobData = {
	/** Actor */
	user: ILocalUser;
	/** Activity */
	content: any;
	/** inbox URL to deliver */
	to: string;
	/** Detail information of inbox */
	inboxInfo?: InboxInfo;
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
	signature: httpSignature.IParsedSignature;
	request?: InboxRequestData;
};

export type InboxRequestData = {
	ip?: string;
};

export type DbJobData = DbUserJobData | DbUserImportJobData | DeleteNoteJobData | NotifyPollFinishedJobData | ExpireMuteJobData;

export type DbUserJobData = {
	user: ILocalUser;
};

export type DbUserImportJobData = {
	user: ILocalUser;
	fileId: ObjectID;
};

export type DeleteNoteJobData = {
	noteId: ObjectID;
};

export type NotifyPollFinishedJobData = {
	userId: string;	// ObjectIDを入れてもstringでシリアライズされるだけ
	noteId: string;
}

export type ExpireMuteJobData = {
	muteId: string;
}
