import { IRemoteUser, IUser } from '../../models/user';
import { ApObject, getApIds } from './type';
import Resolver from './resolver';
import { resolvePerson } from './models/person';
import { unique, concat } from '../../prelude/array';
import * as promiseLimit from 'promise-limit';

type Visibility = 'public' | 'home' | 'followers' | 'specified';

type AudienceInfo = {
	visibility: Visibility,
	mentionedUsers: IUser[],
	visibleUsers: IUser[],
};

export async function parseAudience(actor: IRemoteUser, to?: ApObject, cc?: ApObject, resolver?: Resolver): Promise<AudienceInfo> {
	const toGroups = groupingAudience(getApIds(to), actor);
	const ccGroups = groupingAudience(getApIds(cc), actor);

	const others = unique(concat([toGroups.other, ccGroups.other]));

	const limit = promiseLimit<IUser | null>(2);
	const mentionedUsers = (await Promise.all(
		others.map(id => limit(() => resolvePerson(id, null, resolver).catch(() => null)))
	)).filter((x): x is IUser => x != null);

	if (toGroups.public.length > 0) {
		return {
			visibility: 'public',
			mentionedUsers,
			visibleUsers: []
		};
	}

	if (ccGroups.public.length > 0) {
		return {
			visibility: 'home',
			mentionedUsers,
			visibleUsers: []
		};
	}

	if (toGroups.followers.length > 0 || ccGroups.followers.length > 0) {
		return {
			visibility: 'followers',
			mentionedUsers,
			visibleUsers: []
		};
	}

	return {
		visibility: 'specified',
		mentionedUsers,
		visibleUsers: mentionedUsers
	};
}

function groupingAudience(ids: string[], actor: IRemoteUser) {
	const groups = {
		public: [] as string[],
		followers: [] as string[],
		other: [] as string[],
	};

	for (const id of ids) {
		if (isPublic(id)) {
			groups.public.push(id);
		} else if (isFollowers(id, actor)) {
			groups.followers.push(id);
		} else {
			groups.other.push(id);
		}
	}

	groups.other = unique(groups.other);

	return groups;
}

export function isPublic(id: string) {
	return [
		'https://www.w3.org/ns/activitystreams#Public',
		'as:Public',
		'Public',
	].includes(id);
}

export function isFollowers(id: string, actor: IRemoteUser) {
	return [
		`${actor.uri}/followers`,
		// actor.followerUri,	// TODO
	].includes(id);
}
