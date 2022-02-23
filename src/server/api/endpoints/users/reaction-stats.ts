import $ from 'cafy';
import define from '../../define';
import NoteReaction from '../../../../models/note-reaction';
import { decodeReaction } from '../../../../misc/reaction-lib';
import { packEmojis } from '../../../../misc/pack-emojis';
import ID, { transform } from '../../../../misc/cafy-id';
import { genMeid7 } from '../../../../misc/id/meid7';
import Note from '../../../../models/note';
import * as mongo from 'mongodb';
import { concat, unique } from '../../../../prelude/array';

export const meta = {
	tags: ['reactions', 'users'],

	params: {
		target: {
			validator: $.optional.str,
			desc: {
				'ja-JP': 'target',
				'en-US': 'target'
			}
		},

		userId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のユーザーのID',
				'en-US': 'Target user ID'
			}
		},

		limit: {
			validator: $.optional.num.range(1, 1000),
			default: 20,
			desc: {
				'ja-JP': '取得数'
			}
		},

		days: {
			validator: $.optional.num.range(1, 30),
			default: 30,
			desc: {
				'ja-JP': '集計期間 (日)'
			}
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
	cacheSec: 3600 * 24,
};

type ReactionStat = {
	/** Reaction */
	_id: string,
	count: number
};

export default define(meta, async (ps, me) => {
	const date = new Date(Date.now() - (1000 * 60 * 60 * 24 * ps.days));
	const id = genMeid7(date);

	// よくするリアクション
	const queryReactions = NoteReaction.aggregate([
		{
			$match: {
				userId: ps.userId,
				createdAt: { $gt: date }
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
	]) as Promise<ReactionStat[]>;

	// よくされるリアクション
	const queryReacteds = ps.target === 'reactions' ? [] : Note.aggregate([
		{
			$match: {
				userId: ps.userId,
				_id: { $gt: new mongo.ObjectID(id) },
				reactionCounts: { $ne: {} },
			}
		},
		{
			$lookup: {
				from: 'noteReactions',
				localField: '_id',
				foreignField: 'noteId',
				as: '_reactions',
			}
		},
		{
			$group: {
				_id: '$_reactions.reaction',
				count: { $sum: 1 }
			}
		},
		{
			$unwind: '$_id'
		},
		{
			$sort: { count: -1 }
		},
		{
			$skip: ps.offset
		},
		{
			$limit: ps.limit * 3
		}
	]) as Promise<ReactionStat[]>;

	const [xs, ys] = await Promise.all([queryReactions, queryReacteds]);

	const reactions = xs.map(x => {
		return {
			count: x.count,
			reaction: decodeReaction(x._id)
		}
	});

	const reacteds = ys.map(x => {
		return {
			count: x.count,
			reaction: decodeReaction(x._id)
		}
	});

	// なんか被るので多めに取得して再集計
	const n: Record<string, number> = {};
	for (const r of reacteds) {
		if (r.reaction == '__proto__') continue;
		if (n[r.reaction]) {
			n[r.reaction] += r.count;
		} else {
			n[r.reaction] = 0;
		}
	}

	const reacteds2 = Object.keys(n)
		.map(x => ({ reaction: x, count: n[x] }))
		.sort((a, b) => a.count - b.count)
		.splice(0, ps.limit);

	const reactionNames = unique(concat([xs.map(x => x._id), ys.map(x => x._id)]));
	const emojis = await packEmojis(reactionNames.map(x => decodeReaction(x)).map(x => x.replace(/:/g, '')), null);

	const r = {
		reactions,
		reacteds: reacteds2,
		emojis
	}

	return r;
});
