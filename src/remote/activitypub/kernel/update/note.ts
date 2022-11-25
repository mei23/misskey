import { IRemoteUser } from '../../../../models/user';
import deleteNode from '../../../../services/note/delete';
import { apLogger } from '../../logger';
import { getApLock } from '../../../../misc/app-lock';
import DbResolver from '../../db-resolver';
import { getApId, IPost } from '../../type';
import { extractApHost } from '../../../../misc/convert-host';
import { createNote } from '../../models/note';
import { StatusError } from '../../../../misc/fetch';

const logger = apLogger;

export default async function(actor: IRemoteUser, note: IPost): Promise<string> {
	if (typeof note === 'object') {
		if (actor.uri !== note.attributedTo) {
			return `skip: actor.uri !== note.attributedTo`;
		}

		if (typeof note.id === 'string') {
			if (extractApHost(note.id) !== extractApHost(actor.uri)) {
				return `skip: host in actor.uri !== host in note.id`;
			}
		}
	}

	const uri = getApId(note);

	logger.info(`Update the Note: ${uri}`);

	const unlock = await getApLock(uri);

	try {
		const dbResolver = new DbResolver();
		const old = await dbResolver.getNoteFromApId(uri);

		if (!old) return 'skip: old note is not found';

		if (!old.userId.equals(actor._id)) {
			return '投稿をUpdateしようとしているユーザーは投稿の作成者ではありません';
		}

		await deleteNode(actor, old);

		const n = await createNote(note);
		return n ? 'ok' : 'skip';
	} catch (e) {
		if (e instanceof StatusError && e.isClientError) {
			return `skip ${e.statusCode}`;
		} else {
			throw e;
		}
	} finally {
		unlock();
	}
}
