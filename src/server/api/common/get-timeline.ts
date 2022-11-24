import Note, { INote, packMany } from '../../../models/note';
import { ILocalUser } from '../../../models/user';

function getStages(query: any, sort: Record<string, number>, limit: number) {
	return [
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
	];
}

export async function getPackedTimeline(me: ILocalUser | null, query: any, sort: Record<string, number>, limit: number, hint: string | undefined = undefined) {
	const begin = new Date().getTime();

	const timeline = await Note.aggregate<INote[]>(getStages(query, sort, limit),
	{
		maxTimeMS: 55000,
		hint,
	});
	
	const after = new Date().getTime();
	const dt = after - begin;

	if (dt > 1000) {
		const x = await explainTimeline(me, query, sort, limit, hint);
		console.log(`SLOWPLAN: ${dt} ${JSON.stringify(x)}`);
	}

	return await packMany(timeline, me);
}

export async function explainTimeline(me: ILocalUser | null, query: any, sort: Record<string, number>, limit: number, hint: string | undefined = undefined) {
	return await Note.aggregate<INote[]>(getStages(query, sort, limit),
	{
		explain: true,
		hint,
	}) as unknown;
}
