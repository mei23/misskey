
export type ThinPackedNote = {
	id: string;
	createdAt: string | null;
	deletedAt: string | null;
	updatedAt: string | null;
	text: string | null
	cw: string | null;
	userId: string;
	user: ThinPackedUser | null;
	replyId: string | null;
	renoteId: string | null;
	viaMobile: boolean;
	visibility: string;
	tags: string[];
	localOnly: boolean;
	copyOnce: boolean;
	score: number;
	renoteCount: number;
	quoteCount: number;
	repliesCount: number;
	reactions: Record<string, number>;	// Forward Compatibility
	reactionCounts: Record<string, number>;
	emojis: {
		name: string;
		url: string;
	}[];
	fileIds: string[];
	files: any;	// TODO
	uri: string | null;
	url: string | null;
	appId: string | null;
	app: any | null;	// TODO

	visibleUserIds: string[];
	mentions: string[];

	notHaveDecorationMfm?: boolean;

	isHidden?: boolean;
}

export type PackedNote = ThinPackedNote & {
	reply?: ThinPackedNote | null;
	renote?: PackedNote | null;
	poll?: any | null;	// TODO
	myReaction?: string | null;
	myRenoteId?: string | null;
};

export type ThinPackedUser = {
	id: string;
	username: string;
	name: string | null;
	host: string | null;
	avatarUrl: string | null;
	avatarColor: string | null;
	isAdmin: boolean;
	isBot: boolean;
	isCat: boolean;
	instance: any;	// TODO
	avoidSearchIndex?: boolean;
	tags: string[];
	emojis: {
		name: string;
		url: string;
	}[];
};

export type PackedUser = ThinPackedUser & {
	createdAt?: string | null;
	updatedAt?: string | null;
	bannerUrl?: string | null;
	bannerColor?: string | null;
	isLocked?: boolean;
	isSilenced?: boolean;
	isSuspended?: boolean;
	isDeleted?: boolean;
	description?: string | null;
	profile?: {
		birthday?: string | null;
		location?: string | null;
	};
	fields?: {
		name: string;
		value: string;
	}[];
	followersCount?: number;
	followingCount?: number;
	notesCount?: number;
	pinnedNoteIds?: string[];
	pinnedNotes?: PackedNote[]
	movedToUser?: ThinPackedUser | null;
	usertags?: string[];

	// local
	isVerified?: boolean;
	isModerator?: boolean;
	twoFactorEnabled?: boolean;
	twitter?: {
		screenName: string;
		userId: string;
	};
	github?: {
		id: string;
		login: string;
	};
	discord?: {
		id: string;
		username: string;
		discriminator: string;
	};

	// remote
	url?: string | null;
	uri?: string | null;

	// my
	avatarId?: string | null;
	bannerId?: string | null;
	alwaysMarkNsfw?: boolean;
	carefulBot?: boolean;
	carefulRemote?: boolean;
	carefulMassive?: boolean;
	refuseFollow?: boolean;
	autoAcceptFollowed?: boolean;
	isExplorable?: boolean;
	hideFollows?: string;
	wallpaperId?: string | null;
	wallpaperUrl?: string | null;
	hasUnreadMessagingMessage?: boolean;
	hasUnreadNotification?: boolean;
	hasUnreadSpecifiedNotes?: boolean;
	hasUnreadMentions?: boolean;
	pendingReceivedFollowRequestsCount?: number;

	// my secrets
	email?: string | null;
	emailVerified?: boolean;
	clientSettings?: any;
	settings?: {
		autoWatch: boolean;
		alwaysMarkNsfw?: boolean;
		pushNotifications?: Record<string, boolean | undefined>;
	};

	// other
	isFollowing?: boolean;
	isFollowed?: boolean;
	hasPendingFollowRequestFromYou?: boolean;
	hasPendingFollowRequestToYou?: boolean;
	isBlocking?: boolean;
	isBlocked?: boolean;
	isMuted?: boolean;
	isHideRenoting?: boolean;

	/*
	movedToUserId?: string | null;
	autoWatch?: boolean;
	hasUnreadAnnouncement?: boolean;
	*/
}

//#region Follow
export type PackedFollowBase = {
	/** Relation ID */
	id: string;
	/** フォローの作成日時 */
	createdAt: string | null;
	/** フォローされたユーザーのID */
	followeeId: string;
	/** フォローしたユーザーのID */
	followerId: string;
}

export type PackedFollowee = PackedFollowBase & {
	/** フォローされたユーザーのオブジェクト */
	followee: PackedUser;
};

export type PackedFollower = PackedFollowBase & {
	/** フォローしているユーザーのオブジェクト */
	follower: PackedUser;
};

export type V10Followees = {
	/** フォローしているユーザーのオブジェクト */
	users: PackedUser[];
	/** 返した中で最後のRelation ID (nextという名前だけどnextではない！) */
	next: string
}

export type V10Followers = {
	/** フォローされたユーザーのオブジェクト */
	users: PackedUser[];
	/** 返した中で最後のRelation ID (nextという名前だけどnextではない！) */
	next: string
}
//#endregion

export type PackedNotification = {
	id: string;
	createdAt: string;
	isRead: boolean;
	type: 'follow' | 'mention' | 'reply' | 'renote' | 'quote' | 'reaction' | 'poll_vote' | 'poll_finished' | 'receiveFollowRequest' | 'highlight' | 'unreadMessagingMessage';
	user: ThinPackedUser;
	userId: string;
	note?: PackedNote | null;
	message?: any | null;
	reaction?: string | null;
	choice?: number | null;
};
