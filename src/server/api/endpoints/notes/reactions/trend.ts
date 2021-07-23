import $ from 'cafy';
import define from '../../../define';
import NoteReaction from '../../../../../models/note-reaction';
import User from '../../../../../models/user';
import { decodeReaction } from '../../../../../misc/reaction-lib';
import { packEmojis } from '../../../../../misc/pack-emojis';

export const meta = {
	tags: ['reactions', 'notes'],

	params: {
		limit: {
			validator: $.optional.num.range(1, 1000),
			default: 20,
		},

		offset: {
			validator: $.optional.num.min(0),
			default: 0,
			desc: {
				'ja-JP': 'オフセット'
			}
		},
	},

	requireCredential: false,
	allowGet: true,
	cacheSec: 600,
};

export default define(meta, async (ps, me) => {
	const users = await User.find({
		host: null,
		isDeleted: { $ne: true },
		isSuspended: { $ne: true },
	}, {
		fields: {
			_id: true
		}
	});

	const xs = await NoteReaction.aggregate([
		{
			$match: {
				userId: { $in: users.map(x => x._id) },
				createdAt: { $gt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) },
			}
		},
		{
			$group: {
				_id: '$reaction',
				count: { $sum: 1 }
			}
		},
		{
			$sort: { count: -1 }
		},
		{
			$skip: ps.offset
		},
		{
			$limit: ps.limit
		}
	]) as { _id: string, count: number }[];

	const reactions = xs.map(x => {
		return {
			count: x.count,
			reaction: decodeReaction(x._id)
		}
	});

	const emojis = await packEmojis(xs.map(x => decodeReaction(x._id)).map(x => x.replace(/:/g, '')), null);

	const r = {
		reactions,
		emojis
	}

	return r;
});
