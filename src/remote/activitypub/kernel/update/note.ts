import { IRemoteUser } from '../../../../models/user';
import { apLogger } from '../../logger';
import { getApLock } from '../../../../misc/app-lock';
import DbResolver from '../../db-resolver';
import { getApId, IPost } from '../../type';
import { extractApHost } from '../../../../misc/convert-host';
import { parseBasic } from '../../../../mfm/parse';
import { extractEmojis } from '../../../../mfm/extract-emojis';
import { extractHashtags } from '../../../../mfm/extract-hashtags';
import Note from '../../../../models/note';
import { publishNoteStream } from '../../../../services/stream';
import { htmlToMfm } from '../../misc/html-to-mfm';

const logger = apLogger;

export default async function(actor: IRemoteUser, note: IPost): Promise<string> {
	if (typeof note.id !== 'string') return 'skip';

	// Note.attributedToは署名と同じである必要がある
	if (actor.uri !== note.attributedTo) {
		return `skip: actor.uri !== note.attributedTo`;
	}

	// Note.idのホストは署名と同一である必要がある
	if (extractApHost(note.id) !== extractApHost(actor.uri)) {
		return `skip: host in actor.uri !== host in note.id`;
	}
	
	const uri = getApId(note);

	logger.info(`Update the Note: ${uri}`);

	const unlock = await getApLock(uri);

	try {
		const dbResolver = new DbResolver();

		// 元ノート照合
		const origin = await dbResolver.getNoteFromApId(uri);
		if (!origin) return 'skip: old note is not found';

		// 同じユーザーである必要がある
		if (!origin.userId.equals(actor._id)) {
			return '投稿をUpdateしようとしているユーザーは投稿の作成者ではありません';
		}

		// validateはinboxのハードリミットでいい

		// テキストのパース
		const text = note._misskey_content || (note.content ? htmlToMfm(note.content, note.tag) : null);
		const cw = note.summary === '' ? null : note.summary;

		// extract emojis, tags, mentions
		const tokens = text ? (parseBasic(text) || []) : [];
		const cwTokens = cw ? (parseBasic(cw) || []) : [];
		const combinedTokens = tokens.concat(cwTokens);
		const emojis = extractEmojis(combinedTokens);
		const tags = extractHashtags(combinedTokens).filter(tag => Array.from(tag || '').length <= 128).splice(0, 64);

		// Update
		const updates = {
			updatedAt: new Date(),
			text: text?.trim(),
			cw: cw ?? null,
			emojis,
			tags,
		};

		await Note.update({ _id: origin._id }, {
			$set: updates
		});

		// Publish to streaming
		publishNoteStream(origin._id, 'updated', updates);

 
		return 'ok';
	} finally {
		unlock();
	}
}
