import User from '../models/user';
import Emoji, { IEmoji } from '../models/emoji';
import { toUnicode, toASCII } from 'punycode/';
import config from '../config';
import { isSelfHost } from './convert-host';
import getDriveFileUrl from './get-drive-file-url';
import DriveFile from '../models/drive-file';
import { query } from '../prelude/url';

type IREmoji = {
	/**
	 * requested emoji key
	 */
	name: string,
	url: string,
	/***
	 * resolved host(in unicode)
	 */
	host: string,
	resolvable: string,
	direction?: string;
};

const SELF_HOST = null;

/**
 * 絵文字クエリ
 * @param emojis 絵文字名一覧
 * @param ownerHost 投稿またはプロフィール所有者のホスト
 * @param reactionEmojis リアクションの絵文字名一覧
 */
export async function packEmojis(emojis: string[], ownerHost: string | null) {
	const [custom, avatar] = await Promise.all([
		packCustomEmojis(emojis, ownerHost),
		packAvatarEmojis(emojis, ownerHost)
	]);

	return custom.concat(avatar);
}

export async function packAvatarEmoji(str: string, ownerHost: string | null): Promise<IREmoji | null> {
	// str: '@a' => { username: 'a', host: ownerHost } のアバター
	// str: '@a@b' => { username: 'a', host: 'b } のアバター

	const match = str.match(/^@([\w-]+)(?:@([\w.-]+))?$/);
	if (!match) return null;

	let queryHost = match[2] || ownerHost || SELF_HOST;
	if (isSelfHost(queryHost)) queryHost = SELF_HOST;

	const usernameLower = match[1].toLowerCase();
	const host = normalizeHost(queryHost);	// DB (Unicode) host
	const resolvable = `@${match[1]}` + (queryHost ? `@${normalizeAsciiHost(queryHost)}` : '');

	const user = await User.findOne({
		usernameLower,
		host
	});

	return {
		name: str,
		url: (user && user.avatarId) ? getDriveFileUrl(await DriveFile.findOne({ _id: user.avatarId }), true) : `${config.driveUrl}/default-avatar.jpg`,
		host,
		resolvable,
	} as IREmoji;
}

/**
 * Pack avatar emojis
 * @param strs 絵文字名一覧
 * @param ownerHost 投稿またはプロフィール所有者のホスト
 */
export async function packAvatarEmojis(strs: string[], ownerHost: string | null): Promise<IREmoji[]> {
	const emojis = await Promise.all(strs.map(str => packAvatarEmoji(str, ownerHost)));
	return emojis.filter((x): x is IREmoji => x != null);
}

export async function packCustomEmoji(str: string, ownerHost: string | null): Promise<IREmoji | null> {
	// str: 'a' => Emoji { name: 'a', host: ownerHost }
	// str: 'a@.' => Emoji { name: 'a', host: null }	(リアクションのホスト省略系は必ずこの形式で来る)
	// str: '@a@b' => Emoji { username: 'a', host: 'b' }

	const match = str.match(/^(\w+)(?:@([\w.-]+))?$/);
	if (!match) return null;

	// クエリに使うホスト
	const queryHost = match[2] === '.' ? SELF_HOST : match[2] === undefined ? ownerHost : isSelfHost(match[2]) ? SELF_HOST : (match[2] || ownerHost);
	const name = match[1];
	const host = normalizeHost(queryHost);
	const resolvable = `${match[1]}` + (queryHost ? `@${normalizeAsciiHost(queryHost)}` : '');

	const emoji = await Emoji.findOne({
		name,
		host
	}, {
		fields: { _id: false }
	});

	if (emoji == null) return null;

	const e = {
		name: str,
		url: getEmojiUrl(emoji),
		host: host,
		resolvable: resolvable,
	} as IREmoji;

	if (emoji.direction) {
		e.direction = emoji.direction
	}

	return e;
}

/**
 * Pack custom emojis
 * @param emojis 絵文字名一覧
 * @param host 投稿またはプロフィール所有者のホスト
 * @param foreign 外部ホスト指定を許可する
 */
export async function packCustomEmojis(names: string[], ownerHost: string | null): Promise<IREmoji[]> {
	const emojis = await Promise.all(names.map(name => packCustomEmoji(name, ownerHost)));
	return emojis.filter((x): x is IREmoji => x != null);
}

const normalizeHost = (host: string | null) => {
	if (host == null) return null;
	return toUnicode(host.toLowerCase());
};

const normalizeAsciiHost = (host: string | null) => {
	if (host == null) return null;
	return toASCII(host.toLowerCase());
};

export function getEmojiUrl(emoji: IEmoji) {
	return (emoji.host && !emoji.saved) ? `${config.url}/proxy/image.png?${query({url: emoji.url})}` : emoji.url;
}
