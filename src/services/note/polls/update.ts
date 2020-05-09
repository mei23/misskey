import * as mongo from 'mongodb';
import Note, { INote } from '../../../models/note';
import { updateQuestion } from '../../../remote/activitypub/models/question';
import ms = require('ms');
import Logger from '../../logger';
import User, { isLocalUser } from '../../../models/user';
import renderUpdate from '../../../remote/activitypub/renderer/update';
import { renderActivity } from '../../../remote/activitypub/renderer';
import renderNote from '../../../remote/activitypub/renderer/note';
import { deliverToFollowers } from '../../../remote/activitypub/deliver-manager';
import { deliverToRelays } from '../../relay';

const logger = new Logger('pollsUpdate');

export async function triggerUpdate(note: INote) {
	if (!note.updatedAt || Date.now() - new Date(note.updatedAt).getTime() > ms('1min')) {
		logger.info(`Updating ${note._id}`);

		try {
			const updated = await updateQuestion(note.uri);
			logger.info(`Updated ${note._id} ${updated ? 'changed' : 'nochange'}`);
		} catch (e) {
			logger.error(e);
		}
	}
}

export async function deliverQuestionUpdate(noteId: mongo.ObjectID) {
	const note = await Note.findOne({
		_id: noteId,
	});

	const user = await User.findOne({
		_id: note.userId
	});

	if (isLocalUser(user)) {
		const content = renderActivity(renderUpdate(await renderNote(note, false), user));
		deliverToFollowers(user, content, true);
		deliverToRelays(user, content);
	}
}
