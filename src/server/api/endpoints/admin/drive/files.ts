import $ from 'cafy';
import { toDbHost } from '../../../../../misc/convert-host';
import { genTypeFilterRegex, typeFilterValidater } from '../../../../../misc/mime-type-filter';
import File, { packMany } from '../../../../../models/drive-file';
import { getSystem1 } from '../../../../../services/emoji-store';
import define from '../../../define';

export const meta = {
	tags: ['admin'],

	requireCredential: false,
	requireModerator: true,

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},

		offset: {
			validator: $.optional.num.min(0),
			default: 0
		},

		origin: {
			validator: $.optional.str.or([
				'combined',
				'local',
				'remote',
				'system',
			]),
			default: 'local'
		},

		hostname: {
			validator: $.optional.nullable.str,
			default: null,
		},

		attached: {
			validator: $.optional.str.or([
				'all',
				'attached',
				'notAttached',
			]),
		},

		type: {
			validator: $.optional.str.match(typeFilterValidater)
		},
	}
};

export default define(meta, async (ps, me) => {
	const q = {
		'metadata.deletedAt': { $exists: false },
		$and: [ {} ],
	} as any;

	if (ps.hostname != null && ps.hostname.length > 0) {
		q['metadata._user.host'] = toDbHost(ps.hostname);
	} else {
		if (ps.origin === 'system') {
			q['metadata._user.host'] = null;
			const s = await getSystem1();
			q['metadata.userId'] = s._id;
		} else if (ps.origin === 'local') {
			q['metadata._user.host'] = null;
			const s = await getSystem1();
			q['metadata.userId'] = { $ne: s._id };
		} else if (ps.origin === 'remote') {
			q['metadata._user.host'] = { $ne: null };
		}
	}

	if (ps.attached === 'attached') {
		q.$and.push({
			$or: [	// any
				{ 'metadata.attachedNoteIds.0': { $exists: true } },
				{ 'metadata.attachedMessageIds.0': { $exists: true } },
				{ _id: me.avatarId },
				{ _id: me.bannerId },
			]
		})
	} else if (ps.attached === 'notAttached') {
		q.$and.push({
			$and: [	// all
				{ 'metadata.attachedNoteIds.0': { $exists: false } },
				{ 'metadata.attachedMessageIds.0': { $exists: false } },
				{ _id: { $ne: me.avatarId } },
				{ _id: { $ne: me.bannerId } },
			]
		});
	}

	if (ps.type) {
		q.contentType = genTypeFilterRegex(ps.type);
	}

	const files = await File
		.find(q, {
			limit: ps.limit,
			sort: { _id: -1 },
			skip: ps.offset
		});

	return await packMany(files, { detail: true, withUser: true, self: true });
});
