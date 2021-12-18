import { IUser, isLocalUser } from '../../../models/user';
import { resolvePerson } from '../models/person';
import { ApObject, getApIds } from '../type';

export async function resolveAnotherUser(selfUri: string, ids: ApObject | undefined) {
	const users = await resolveAnotherUsers(selfUri, ids);
	return users.length > 0 ? users[0] : null;
}

export async function resolveAnotherUsers(selfUri: string, ids: ApObject | undefined) {
	const users = await Promise.all(
		getApIds(ids).map(uri => resolvePerson(uri).catch(() => null))
	);

	return users
		.filter((x): x is IUser => x != null)
		.filter(x => isLocalUser(x) || x.uri !== selfUri);
}
