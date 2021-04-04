export interface MfmNode {
	type: string;
	props: Record<string, any>;
	children: MfmNode[];
}

export interface MfmMentionNode extends MfmNode {
	type: 'mention';
	props: {
		canonical: string;
		username: string;
		host: string;
		acct: string;
	}
}

export interface MfmHashtagNode extends MfmNode {
	type: 'hashtag';
	props: {
		hashtag: string;
	};
}

export interface MfmEmojiNode extends MfmNode {
	type: 'emoji';
	props: {
		name: string;
	};
}

// TODO

//export type MfmForest = MfmNode[];

export function createMfmNode(type: string, props: Record<string, any> = {}, children: MfmNode[] = []): MfmNode {
	return {
		type,
		props,
		children
	}
}

// eslint-disable-next-line no-useless-escape
export const urlRegex     = /^https?:\/\/[\w\/:%#@\$&\?!\(\)\[\]~\.,=\+\-]+/;
export const urlRegexFull = /^https?:\/\/[\w\/:%#@\$&\?!\(\)\[\]~\.,=\+\-]+$/;
