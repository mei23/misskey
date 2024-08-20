import { ObjectID } from 'mongodb';
import * as Router from '@koa/router';
import config from '../../config';
import { ILocalUser } from '../../models/user';
import { renderActivity } from '../../remote/activitypub/renderer';
import renderOrderedCollection from '../../remote/activitypub/renderer/ordered-collection';
import { setResponseType } from '../activitypub';
import Note, { INote } from '../../models/note';
import renderNote from '../../remote/activitypub/renderer/note';

export default async (ctx: Router.RouterContext, user: ILocalUser) => {
	const pinnedNoteIds = user.pinnedNoteIds || [];

	const pinnedNotes = await Promise.all(pinnedNoteIds.filter(ObjectID.isValid).map(id => Note.findOne({ _id: id })));

	const renderedNotes = await Promise.all(pinnedNotes.filter((note): note is INote => note != null && note.deletedAt == null).map(note => renderNote(note)));

	const rendered = renderOrderedCollection(
		`${config.url}/users/${user._id}/collections/featured`,
		renderedNotes.length, null, null, renderedNotes
	);

	ctx.body = renderActivity(rendered);
	ctx.set('Cache-Control', 'public, max-age=180');
	setResponseType(ctx);
};
