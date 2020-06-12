import Note, { INote } from '../../../models/note';
import { IUser } from '../../../models/user';

export async function findJoinedNotes(query: any, sort: any, limit: number, maxTimeMS = 60000) {
	const notes = await Note.aggregate([{
		$match: query
	}, {
		$sort: sort
	}, {
		$limit: limit,
	}, {
		// join User
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
						avatarColor: true,
						avatarId: true,
						bannerId: true,
						emojis: true,
						avoidSearchIndex: true,
						hideFollows: true,
						isCat: true,
						isBot: true,
						isOrganization: true,
						isGroup: true,
						isAdmin: true,
						isVerified: true
					}
				}
			],
			as: 'user',
		}
	}, {
		$unwind: '$user'
	}], {
		maxTimeMS
	}) as (INote & { user: IUser })[];

	return notes;
}
