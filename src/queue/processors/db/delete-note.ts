import * as Bull from 'bull';
import { queueLogger } from '../../logger';
import Note from '../../../models/note';
import User from '../../../models/user';
import del from '../../../services/note/delete';
import { DeleteNoteJobData } from '../../types';

const logger = queueLogger.createSubLogger('delete-note');

export async function deleteNote(job: Bull.Job<DeleteNoteJobData>): Promise<string> {
	logger.info(`deleting note ${job.data.noteId} ...`);

	const note = await Note.findOne(job.data.noteId);
	if (note == null) {
		return `skip: note not found (${job.data.noteId})`;
	}

	const user = await User.findOne(note.userId);
	if (user == null) {
		return `skip: note user not found (${note.userId})`;
	}

	await del(user, note);

	return `ok: deleted note: ${note._id}`;
}
