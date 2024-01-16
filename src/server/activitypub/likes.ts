import { ObjectID } from 'mongodb';
import * as Router from '@koa/router';
import config from '../../config';
import $ from 'cafy';
import ID, { transform } from '../../misc/cafy-id';
import { renderLike } from '../../remote/activitypub/renderer/like';
import { renderActivity } from '../../remote/activitypub/renderer';
import renderOrderedCollection from '../../remote/activitypub/renderer/ordered-collection';
import renderOrderedCollectionPage from '../../remote/activitypub/renderer/ordered-collection-page';
import { setResponseType, isNoteUserAvailable } from '../activitypub';

import Note from '../../models/note';
import { sum } from '../../prelude/array';
import * as url from '../../prelude/url';
import NoteReaction from '../../models/note-reaction';

export default async (ctx: Router.RouterContext) => {
	if (config.disableFederation) ctx.throw(404);

	if (!ObjectID.isValid(ctx.params.note)) {
		ctx.status = 404;
		return;
	}

	const note = await Note.findOne({
		_id: new ObjectID(ctx.params.note),
		deletedAt: { $exists: false },
		'_user.host': null,
		visibility: { $in: ['public', 'home'] },
		localOnly: { $ne: true },
		copyOnce: { $ne: true }
	});

	if (note == null || !await isNoteUserAvailable(note)) {
		ctx.status = 404;
		return;
	}

	// Get 'cursor' parameter
	const [cursor, cursorErr] = $.optional.type(ID).get(ctx.request.query.cursor);

	// Get 'page' parameter
	const pageErr = !$.optional.str.or(['true', 'false']).ok(ctx.request.query.page);
	const page: boolean = ctx.request.query.page === 'true';

	// Validate parameters
	if (cursorErr || pageErr) {
		ctx.status = 400;
		return;
	}

	const limit = 100;
	const partOf = `${config.url}/notes/${note._id}/likes`;

	if (page) {
		const query = {
			noteId: note._id
		} as any;

		// カーソルが指定されている場合
		if (cursor) {
			query._id = {
				$lt: transform(cursor)
			};
		}

		const reactions = await NoteReaction.find(query, {
			limit: limit + 1,
			sort: { _id: -1 },
		});

		// 「次のページ」があるかどうか
		const inStock = reactions.length === limit + 1;
		if (inStock) reactions.pop();

		const renderedLikes = await Promise.all(reactions.map(reaction => reaction.uri ?? renderLike(reaction, note)));

		const rendered = renderOrderedCollectionPage(
			`${partOf}?${url.query({
				page: 'true',
				cursor
			})}`,
			sum(Object.values(note.reactionCounts)),
			renderedLikes, partOf,
			null,
			inStock ? `${partOf}?${url.query({
				page: 'true',
				cursor: reactions[reactions.length - 1]._id.toHexString()
			})}` : null
		);

		ctx.body = renderActivity(rendered);
		ctx.set('Cache-Control', 'public, max-age=180');
		setResponseType(ctx);
	} else {
		// index page
		const rendered = renderOrderedCollection(partOf, sum(Object.values(note.reactionCounts)), `${partOf}?page=true`, null);
		ctx.body = renderActivity(rendered);
		ctx.set('Cache-Control', 'public, max-age=180');
		setResponseType(ctx);
	}
};
