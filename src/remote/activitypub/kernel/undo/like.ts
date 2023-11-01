import { IRemoteUser } from '../../../../models/user';
import { ILike, getApId } from '../../type';
import deleteReaction, { ReactionDeleteError } from '../../../../services/note/reaction/delete';
import { fetchNote } from '../../models/note';

/**
 * Process Undo.Like activity
 */
export default async (actor: IRemoteUser, activity: ILike): Promise<string> => {
	const targetUri = getApId(activity.object);

	const note = await fetchNote(targetUri);
	if (!note) return `skip: target note not found ${targetUri}`;

	await deleteReaction(actor, note).catch(e => {
		if (e instanceof ReactionDeleteError) return;
		throw e;
	});

	return `ok`;
};
