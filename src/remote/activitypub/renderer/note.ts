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

export default async function renderNote(note: INote, dive = true, isTalk = false): Promise<any> {
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

	let apText = text;
	if (apText == null) apText = '';

	if (quote) {
		apText += `\n\nRE: ${quote}`;
	}

	const summary = note.cw === '' ? String.fromCharCode(0x200B) : note.cw;

	const content = getNoteHtml(Object.assign({}, note, {
		text: apText
	}));

	const emojis = await getEmojis(note.emojis);
	const apemojis = emojis.map(emoji => renderEmoji(emoji));

	const tag = [
		...hashtagTags,
		...mentionTags,
		...apemojis,
	];

	const {
		choices = [],
		expiresAt = null,
		multiple = false
	} = note.poll || {};

	const asPoll = note.poll ? {
		type: 'Question',
		content: getNoteHtml(Object.assign({}, note, {
			text: text
		})),
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

	const asTalk = isTalk ? {
		_misskey_talk: true
	} : {};

	return {
		id: `${config.url}/notes/${note._id}`,
		url: `${config.url}/notes/${note._id}`,
		type: 'Note',
		attributedTo,
		summary,
		content,
		_misskey_content: text,
		_misskey_quote: quote,
		quoteUri: quote,
		published: note.createdAt.toISOString(),
		to,
		cc,
		inReplyTo,
		attachment: files.map(renderDocument),
		sensitive: note.cw != null || files.some(file => file.metadata.isSensitive),
		tag,
		...asPoll,
		...asTalk
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
