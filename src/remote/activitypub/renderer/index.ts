import config from '../../../config';
import { v4 as uuid } from 'uuid';
import { IActivity } from '../type';
import { LdSignature } from '../misc/ld-signature';
import { ILocalUser } from '../../../models/user';

export const renderActivity = (x: any): IActivity | null => {
	if (x == null) return null;

	if (x !== null && typeof x === 'object' && x.id == null) {
		x.id = `${config.url}/${uuid()}`;
	}

	const imports = [
		'https://www.w3.org/ns/activitystreams',
		'https://w3id.org/security/v1',
	];

	// namespaces (null means already defined in imports)
	const nss: Record<string, string | null> = {
		as: null,	// defined in 'https://www.w3.org/ns/activitystreams'
		vcard: null,	// defined in 'https://www.w3.org/ns/activitystreams'
		sec: null,	// defined in 'https://w3id.org/security/v1'
		// :

		// Some extra or vendor namespaces
		toot: 'http://joinmastodon.org/ns#',	// So-called Mastodon
		schema: 'http://schema.org#',
		misskey: 'https://misskey-hub.net/ns#',
		fedibird: 'http://fedibird.com/ns#',
	};

	// Definitions! (required ns => key => value)
	const defs: Record<string, Record<string, string | object>> = {
		sec: {
			Key: 'sec:Key',
		},
		as: {	// Not defined by the activitystreams, but defined in Mastodon.
			manuallyApprovesFollowers: 'as:manuallyApprovesFollowers',
			sensitive: 'as:sensitive',
			Hashtag: 'as:Hashtag',
		},
		toot: {
			Emoji: 'toot:Emoji',
			featured: 'toot:featured',
			discoverable: 'toot:discoverable',
			indexable: 'toot:indexable',
		},
		schema: {
			PropertyValue: 'schema:PropertyValue',
			value: 'schema:value',
		},
		misskey: {
			'_misskey_content': 'misskey:_misskey_content',
			'_misskey_quote': 'misskey:_misskey_quote',
			'_misskey_reaction': 'misskey:_misskey_reaction',
			'_misskey_votes': 'misskey:_misskey_votes',
			'isCat': 'misskey:isCat',
		},
		fedibird: {
			quoteUri: 'fedibird:quoteUri',
			searchableBy: { '@id': 'fedibird:searchableBy', '@type': '@id' },
		},
	};

	// flatten defs for processing
	type Def = {
		/*** Key, eg: '_misskey_content' */
		key: string;
		/*** Resolved value, eg: 'misskey:_misskey_content' */
		value: string | Object;
		/*** Required namaspace, eg: 'misskey' */
		ns: string;
	};

	const fdefs = new Map<string, Def>();

	for (const [ns, nsdef] of Object.entries(defs)) {
		for (const [key, value] of Object.entries(nsdef)) {
			fdefs.set(key, { key, ns, value })
		}
	}

	// とりま全部
	const requiredKeys = Array.from(fdefs.keys());

	// builds
	const exporseNss = new Map<string, string>();
	const exposeDefs = new Map<string, string | object>();
	for (const key of requiredKeys) {
		const def = fdefs.get(key);
		if (def == null) {
			console.warn(`JSON-LD: key=${key} is not in defs, bug?`);
		} else {
			const nsValue = nss[def.ns];
			if (nsValue === undefined) {
				console.warn(`JSON-LD: ns=${key} is not in nss, bug?`);
			} else if (nsValue === null) {
				// alredy in imported one, so safety ignore it
			} else {
				exporseNss.set(def.ns, nsValue)
			}

			exposeDefs.set(key, def.value)
 		}
	}

	const context = [
		imports,
		{
			...Object.fromEntries(exporseNss),
			...Object.fromEntries(exposeDefs),
		}
	];
	
	console.log(JSON.stringify(context));	// ★

	return Object.assign({
		'@context': context
	}, x);
};

export const attachLdSignature = async (activity: any, user: ILocalUser): Promise<IActivity | null> => {
	if (activity == null) return null;

	const ldSignature = new LdSignature();
	ldSignature.debug = false;
	activity = await ldSignature.signRsaSignature2017(activity, user.keypair, `${config.url}/users/${user._id}#main-key`);

	return activity;
};
