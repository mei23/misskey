import Note, { INote, packMany } from '../../../models/note';
import { ILocalUser } from '../../../models/user';

export async function getPackedTimeline(me: ILocalUser | null, query: any, sort: Record<string, number>, limit: number) {
	const timeline = await Note.aggregate<INote[]>([
		{
			$match: { $and: [
				query,
				{'fileIds.100': { $exists: false }}
			]},
		}, {
			$sort: sort
		}, {
			$limit: limit
		}, {
			$lookup: {
				from: 'users',
				let: { userId: '$userId' },
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: [ '$_id', '$$userId' ]
							}
						}
					}, {
						$project: {
							name: true,
							username: true,
							host: true,
							avatarId: true,
							emojis: true,
							isCat: true,
							isBot: true,
							isAdmin: true,
							isVerified: true,
							borderColor: true,
							tags: true,
						}	// $project in pipeline
					}
				],	// pipeline
				as: '__user',
			}	// $lookup
		}, {
			$unwind: {
				path: '$__user'
			}
		}
	],	// aggregates
	{
		maxTimeMS: 55000,
	});

	return await packMany(timeline, me);
}
