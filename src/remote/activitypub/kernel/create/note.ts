import Resolver from '../../resolver';
import { IRemoteUser } from '../../../../models/user';
import { createNote, fetchNote } from '../../models/note';
import { getApLock } from '../../../../misc/app-lock';
import { IObject, getApId, ICreate } from '../../type';
import { extractApHost } from '../../../../misc/convert-host';

/**
 * 投稿作成アクティビティを捌きます
 */
export default async function(resolver: Resolver, actor: IRemoteUser, note: IObject, silent = false, activity?: ICreate): Promise<string> {
	const uri = getApId(note);

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

	const unlock = await getApLock(uri);

	try {
		const exist = await fetchNote(note);
		if (exist) return 'skip: note exists';

		await createNote(note, resolver, silent);
		return 'ok';
	} catch (e) {
		if (e.statusCode >= 400 && e.statusCode < 500) {
			return `skip ${e.statusCode}`;
		} else {
			throw e;
		}
	} finally {
		unlock();
	}
}
