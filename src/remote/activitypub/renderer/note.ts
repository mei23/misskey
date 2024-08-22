import renderDocument from './document';
import renderHashtag from './hashtag';
import renderMention from './mention';
import renderEmoji from './emoji';
import config from '../../../config';
import DriveFile from '../../../models/drive-file';
import Note, { INote } from '../../../models/note';
import User from '../../../models/user';
import { getNoteHtml } from '../misc/get-note-html';
import Emoji, { IEmoji } from '../../../models/emoji';
import { removeNull } from '../../../prelude/array';

export default async function renderNote(note: INote, dive = true): Promise<any> {
	let inReplyTo;
	let inReplyToNote: INote;

	if (note.replyId) {
		inReplyToNote = await Note.findOne({
			_id: note.replyId,
		});

		if (inReplyToNote !== null) {
			const inReplyToUser = await User.findOne({
				_id: inReplyToNote.userId,
			});

			if (inReplyToUser !== null) {
				if (inReplyToNote.uri) {
					inReplyTo = inReplyToNote.uri;
				} else {
					if (dive) {
						inReplyTo = await renderNote(inReplyToNote, false);
					} else {
						inReplyTo = `${config.url}/notes/${inReplyToNote._id}`;
					}
				}
			}
		}
	} else {
		inReplyTo = null;
	}

	let quote;

	if (note.renoteId) {
		const renote = await Note.findOne({
			_id: note.renoteId,
		});

		if (renote) {
			quote = renote.uri ? renote.uri : `${config.url}/notes/${renote._id}`;
		}
	}

	const user = await User.findOne({
		_id: note.userId
	});

	const attributedTo = `${config.url}/users/${user._id}`;

	const mentions = note.mentionedRemoteUsers && note.mentionedRemoteUsers.length > 0
		? note.mentionedRemoteUsers.map(x => x.uri)
		: [];

	let to: string[] = [];
	let cc: string[] = [];

	if (note.copyOnce) {
		to = [`${attributedTo}/followers`];
		cc = mentions;
	} else if (note.visibility == 'public') {
		to = ['https://www.w3.org/ns/activitystreams#Public'];
		cc = [`${attributedTo}/followers`].concat(mentions);
	} else if (note.visibility == 'home') {
		to = [`${attributedTo}/followers`];
		cc = ['https://www.w3.org/ns/activitystreams#Public'].concat(mentions);
	} else if (note.visibility == 'followers') {
		to = [`${attributedTo}/followers`];
		cc = mentions;
	} else {
		to = mentions;
	}

	const mentionedUsers = note.mentions ? await User.find({
		_id: {
			$in: note.mentions
		}
	}) : [];

	const hashtagTags = (note.tags || []).map(tag => renderHashtag(tag));
	const mentionTags = mentionedUsers.map(u => renderMention(u));

	const files = (await Promise.all((note.fileIds || []).map(x => DriveFile.findOne(x)))).filter(x => x != null);

	const text = note.text;

	let apAppend = '';

	if (quote) {
		apAppend += `\n\nRE: ${quote}`;
	}

	const summary = note.cw === '' ? String.fromCharCode(0x200B) : note.cw;

	const { content, noMisskeyContent } = getNoteHtml(note, apAppend);

	const emojis = await getEmojis(note.emojis);
	const apemojis = emojis.map(emoji => renderEmoji(emoji));

	const fepE232Quote = {
		type: 'Link',
		mediaType: 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"',
		rel: 'https://misskey-hub.net/ns#_misskey_quote',
		href: quote,
		name: `RE: ${quote}`,
	};

	const tag = [
		...hashtagTags,
		...mentionTags,
		...apemojis,
		fepE232Quote,
	];

	const {
		choices = [],
		expiresAt = null,
		multiple = false
	} = note.poll || {};

	const asPoll = note.poll ? {
		type: 'Question',
		[expiresAt && expiresAt < new Date() ? 'closed' : 'endTime']: expiresAt,
		[multiple ? 'anyOf' : 'oneOf']: choices.map(({ text, votes }) => ({
			type: 'Note',
			name: text,
			replies: {
				type: 'Collection',
				totalItems: votes
			}
		}))
	} : {};

	return {
		id: `${config.url}/notes/${note._id}`,
		url: `${config.url}/notes/${note._id}`,
		type: 'Note',
		attributedTo,
		summary,
		content,
		...(noMisskeyContent ? {} : {
			_misskey_content: text,
			source: {
				content: text,
				mediaType: 'text/x.misskeymarkdown',
			},
		}),
		_misskey_quote: quote,
		quoteUri: quote,
		published: note.createdAt.toISOString(),
		to,
		cc,
		inReplyTo,
		attachment: removeNull(files).map(renderDocument),
		sensitive: note.cw != null || files.some(file => file?.metadata?.isSensitive),
		likes: `${config.url}/notes/${note._id}/likes`,
		tag,
		...asPoll,
	};
}

export async function getEmojis(names: string[]): Promise<IEmoji[]> {
	if (names == null || names.length < 1) return [];

	const nameToEmoji = async (name: string) => {
		if (name == null) return null;

		const m = name.match(/^(\w+)(?:@([\w.-]+))?$/);
		if (!m) return null;

		// TODO: リモートが対応していないのでリモート分は除外する
		if (m[2] != null) return null;

		const emoji = await Emoji.findOne({
			name: m[1],
			host: m[2] || null
		});

		return emoji;
	};

	const emojis = await Promise.all(
		names.map(name => nameToEmoji(name))
	);

	return emojis.filter((emoji): emoji is IEmoji => emoji != null);
}
