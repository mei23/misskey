export interface MfmNode {
	/** Node type */
	type: string;
	/** Properties */
	props: Record<string, any>;
	/** Child nodes */
	children: MfmNode[];
}

/** メンション */
export interface MfmMentionNode extends MfmNode {
	type: 'mention';
	props: {
		username: string;
		host: string | null;
		/** 入力された表記 */
		acct: string;
		/** ローカルホストの場合省略される, punycodeはデコードされる 表記 */
		canonical: string;
	}
}

/** ハッシュタグ */
export interface MfmHashtagNode extends MfmNode {
	type: 'hashtag';
	props: {
		/** ハッシュタグ (#は含まない) */
		hashtag: string;
	};
}

/** 絵文字 */
export interface MfmEmojiNode extends MfmNode {
	type: 'emoji';
	props: {
		/** カスタム絵文字の場合 カスタム絵文字名 (:は含まない) */
		name?: string;
		/** Unicode絵文字の場合 絵文字 */
		emoji?: string;
		/** Unicode絵文字の場合 Twemojiを迂回するか */
		vendor?: boolean;
		/** Unicode絵文字の場合 ローカル定義の絵文字か */
		local?: boolean;
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
