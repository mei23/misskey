import { IRemoteUser } from '../../../../models/user';
import deleteNode from '../../../../services/note/delete';
import { apLogger } from '../../logger';
import { getApLock } from '../../../../misc/app-lock';
import DbResolver from '../../db-resolver';

const logger = apLogger;

export default async function(actor: IRemoteUser, uri: string): Promise<string> {
	logger.info(`Deleting the Note: ${uri}`);

	const unlock = await getApLock(uri);

	try {
		const dbResolver = new DbResolver();
		const note = await dbResolver.getNoteFromApId(uri);

		if (note == null) {
			return 'skip: note not found';
		}

		if (!note.userId.equals(actor._id)) {
			return '投稿を削除しようとしているユーザーは投稿の作成者ではありません';
		}

		await deleteNode(actor, note);
		return 'ok: note deleted';
	} finally {
		unlock();
	}
}
