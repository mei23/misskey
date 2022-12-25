import { toArray, toSingle } from '../../prelude/array';

export type obj = { [x: string]: any };

export type ApObject = IObject | string | (IObject | string)[];

export interface IObject {
	'@context': string | obj | obj[];
	type: string | string[];
	id?: string;
	summary?: string;
	published?: string;
	cc?: ApObject;
	to?: ApObject;
	attributedTo?: ApObject;
	attachment?: IObject | IObject[];
	inReplyTo?: ApObject;
	replies?: ICollection;
	content?: string;
	name?: string;
	startTime?: Date;
	endTime?: Date;
	icon?: IApImage | IApImage[];
	image?: IApImage | IApImage[];
	url?: ApObject;
	tag?: IObject | IObject[];
	sensitive?: boolean;
	movedTo?: string | IObject;
	alsoKnownAs?: ApObject;
	href?: string;
}

/**
 * Get array of ActivityStreams Objects id
 */
export function getApIds(value: ApObject | undefined): string[] {
	if (value == null) return [];
	const array = toArray(value);
	return array.map(x => getApId(x));
}

/**
 * Get first ActivityStreams Object id
 */
export function getOneApId(value: ApObject): string {
	const firstOne = toSingle(value);
	return getApId(firstOne);
}

/**
 * Get ActivityStreams Object id
 */
export function getApId(value: string | IObject | undefined): string {
	if (typeof value === 'string') return value;
	if (typeof value?.id === 'string') return value.id;
	throw new Error(`cannot detemine id`);
}

/**
 * Get ActivityStreams Object type
 */
export function getApType(value: IObject): string {
	if (typeof value.type === 'string') return value.type;
	if (Array.isArray(value.type) && typeof value.type[0] === 'string') return value.type[0];
	throw new Error(`cannot detect type`);
}

export function getOneApHrefNullable(value: ApObject | undefined): string | undefined {
	const firstOne = Array.isArray(value) ? value[0] : value;
	return getApHrefNullable(firstOne);
}

export function getApHrefNullable(value: string | IObject | undefined): string | undefined {
	if (typeof value === 'string') return value;
	if (typeof value?.href === 'string') return value.href;
	return undefined;
}

export interface IActivity extends IObject {
	//type: 'Activity';
	actor: IObject | string;
	object: IObject | string;
	target?: IObject | string;
	signature?: {
		type: string;
		created: Date;
		creator: string;
		domain?: string;
		nonce?: string;
		signatureValue: string;
	};
}

export interface ICollection extends IObject {
	type: 'Collection';
	totalItems: number;
	items?: ApObject;
	current?: ICollectionPage;
	first?: ICollectionPage;
	last?: ICollectionPage;
}

export interface ICollectionPage extends IObject {
	type: 'CollectionPage';
	totalItems: number;
	items?: (IObject | string)[];
	current?: ICollectionPage;
	first?: ICollectionPage;
	last?: ICollectionPage;	partOf: string;
	next?: ICollectionPage;
	prev?: ICollectionPage;
}

export interface IOrderedCollection extends IObject {
	type: 'OrderedCollection';
	totalItems: number;
	orderedItems?: (IObject | string)[];
	current?: IOrderedCollectionPage;
	first?: IOrderedCollectionPage;
	last?: IOrderedCollectionPage;
}

export interface IOrderedCollectionPage extends IObject {
	type: 'OrderedCollectionPage';
	totalItems: number;
	orderedItems?: (IObject | string)[];
	current?: IOrderedCollectionPage;
	first?: IOrderedCollectionPage;
	last?: IOrderedCollectionPage;
	partOf: string;
	next?: IOrderedCollectionPage;
	prev?: IOrderedCollectionPage;
	startIndex?: number;
}

export interface IPost extends IObject {
	type: 'Note' | 'Question' | 'Article' | 'Audio' | 'Document' | 'Image' | 'Page' | 'Video' | 'Event';
	_misskey_content?: string;
	_misskey_quote?: string;
	quoteUrl?: string;
	quoteUri?: string;
	_misskey_talk?: boolean;
	references: string | ICollection;
}

export const validPost = ['Note', 'Question', 'Article', 'Audio', 'Document', 'Image', 'Page', 'Video', 'Event'];

export const isPost = (object: IObject): object is IPost =>
	validPost.includes(getApType(object));

export interface ITombstone extends IObject {
	type: 'Tombstone';
	formerType?: string;
	deleted?: Date;
}

export const isTombstone = (object: IObject): object is ITombstone =>
	getApType(object) === 'Tombstone';

export interface IQuestion extends IObject {
	type: 'Note' | 'Question';
	_misskey_content?: string;
	_misskey_quote?: string;
	quoteUrl?: string;
	quoteUri?: string;
	oneOf?: IQuestionChoice[];
	anyOf?: IQuestionChoice[];
	endTime?: Date;
	closed?: Date;
}

export const isQuestion = (object: IObject): object is IQuestion =>
	getApType(object) === 'Note' || getApType(object) === 'Question';

interface IQuestionChoice {
	name?: string;
	replies?: ICollection;
	_misskey_votes?: number;
}

export interface IApDocument extends IObject {
	type: 'Audio' | 'Document' | 'Image' | 'Page' | 'Video';
}

export const isDocument = (object: IObject): object is IApDocument =>
	['Audio', 'Document', 'Image', 'Page', 'Video'].includes(getApType(object));

export interface IApImage extends IObject {
	type: 'Image';
}

export const isImage = (object: IObject): object is IApImage =>
	getApType(object) === 'Image';

export interface IApPropertyValue extends IObject {
	type: 'PropertyValue';
	identifier: IApPropertyValue;
	name: string;
	value: string;
}

export const isPropertyValue = (object: IObject): object is IApPropertyValue =>
	object &&
	getApType(object) === 'PropertyValue' &&
	typeof object.name === 'string' &&
	typeof (object as any).value === 'string';

export interface IApMention extends IObject {
	type: 'Mention';
	href: string;
}

export const isMention = (object: IObject): object is IApMention =>
	getApType(object) === 'Mention' &&
	typeof object.href === 'string';

export interface IApHashtag extends IObject {
	type: 'Hashtag';
	name: string;
}

export const isHashtag = (object: IObject): object is IApHashtag =>
	getApType(object) === 'Hashtag' &&
	typeof object.name === 'string';

export interface IActor extends IObject {
	type: 'Person' | 'Service' | 'Organization' | 'Group' | 'Application';
	name?: string;
	preferredUsername: string;
	manuallyApprovesFollowers?: boolean;
	discoverable?: boolean;
	inbox: string;
	sharedInbox?: string;
	publicKey?: {
		id: string;
		publicKeyPem: string;
	};
	followers?: string | ICollection | IOrderedCollection;
	following?: string | ICollection | IOrderedCollection;
	featured?: string | IOrderedCollection;
	outbox: string | IOrderedCollection;
	endpoints?: {
		sharedInbox?: string;
	};
	'vcard:bday'?: string;
	'vcard:Address'?: string;
}

export const validActor = ['Person', 'Service', 'Group', 'Organization', 'Application'];

export const isActor = (object: IObject): object is IActor =>
	validActor.includes(getApType(object));

export interface IApEmoji extends IObject {
	type: 'Emoji';
	name: string;
	icon: IApImage | IApImage[];
	updated?: Date;
}

export const isEmoji = (object: IObject): object is IApEmoji =>
	getApType(object) === 'Emoji' && typeof object.name === 'string' && object.icon != null;

export const isCollection = (object: IObject): object is ICollection =>
	getApType(object) === 'Collection';

export const isOrderedCollection = (object: IObject): object is IOrderedCollection =>
	getApType(object) === 'OrderedCollection';

export const isCollectionPage = (object: IObject): object is ICollectionPage =>
	getApType(object) === 'CollectionPage';

export const isOrderedCollectionPage = (object: IObject): object is IOrderedCollectionPage =>
	getApType(object) === 'OrderedCollectionPage';

export const isCollectionOrOrderedCollection = (object: IObject): object is ICollection | IOrderedCollection =>
	isCollection(object) || isOrderedCollection(object);

export interface ICreate extends IActivity {
	type: 'Create';
}

export interface IDelete extends IActivity {
	type: 'Delete';
}

export interface IUpdate extends IActivity {
	type: 'Update';
}

export interface IRead extends IActivity {
	type: 'Read';
}

export interface IUndo extends IActivity {
	type: 'Undo';
}

export interface IFollow extends IActivity {
	type: 'Follow';
}

export interface IAccept extends IActivity {
	type: 'Accept';
}

export interface IReject extends IActivity {
	type: 'Reject';
}

export interface IAdd extends IActivity {
	type: 'Add';
}

export interface IRemove extends IActivity {
	type: 'Remove';
}

export interface ILike extends IActivity {
	type: 'Like' | 'Dislike' | 'EmojiReaction' | 'EmojiReact';
	_misskey_reaction?: string;
}

export interface IAnnounce extends IActivity {
	type: 'Announce';
}

export interface IBlock extends IActivity {
	type: 'Block';
}

export interface IFlag extends IActivity {
	type: 'Flag';
}

export const isCreate = (object: IObject): object is ICreate => getApType(object) === 'Create';
export const isDelete = (object: IObject): object is IDelete => getApType(object) === 'Delete';
export const isUpdate = (object: IObject): object is IUpdate => getApType(object) === 'Update';
export const isRead = (object: IObject): object is IRead => getApType(object) === 'Read';
export const isUndo = (object: IObject): object is IUndo => getApType(object) === 'Undo';
export const isFollow = (object: IObject): object is IFollow => getApType(object) === 'Follow';
export const isAccept = (object: IObject): object is IAccept => getApType(object) === 'Accept';
export const isReject = (object: IObject): object is IReject => getApType(object) === 'Reject';
export const isAdd = (object: IObject): object is IAdd => getApType(object) === 'Add';
export const isRemove = (object: IObject): object is IRemove => getApType(object) === 'Remove';
export const isLike = (object: IObject): object is ILike => getApType(object) === 'Like' || getApType(object) === 'Dislike' || getApType(object) === 'EmojiReaction' || getApType(object) === 'EmojiReact';
export const isAnnounce = (object: IObject): object is IAnnounce => getApType(object) === 'Announce';
export const isBlock = (object: IObject): object is IBlock => getApType(object) === 'Block';
export const isFlag = (object: IObject): object is IFlag => getApType(object) === 'Flag';
