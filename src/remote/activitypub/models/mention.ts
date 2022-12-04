import { toArray, unique } from '../../../prelude/array';
import { IObject, isMention, IApMention } from '../type';
import { resolvePerson } from './person';
import * as promiseLimit from 'promise-limit';
import { IUser } from '../../../models/user';
import Resolver from '../resolver';

export async function extractApMentions(tags: IObject | IObject[] | null | undefined, resolver: Resolver) {
	const hrefs = unique(extractApMentionObjects(tags).map(x => x.href));

	const limit = promiseLimit<IUser | null>(2);
	const mentionedUsers = (await Promise.all(
		hrefs.map(x => limit(() => resolvePerson(x, null, resolver).catch(() => null)))
	)).filter((x): x is IUser => x != null);

	return mentionedUsers;
}

export function extractApMentionObjects(tags: IObject | IObject[] | null | undefined): IApMention[] {
	if (tags == null) return [];
	return toArray(tags).filter(isMention);
}
