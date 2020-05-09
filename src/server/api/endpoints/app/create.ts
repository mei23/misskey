import $ from 'cafy';
import App, { pack } from '../../../../models/app';
import define from '../../define';
import { unique } from '../../../../prelude/array';
import { secureRndstr } from '../../../../misc/secure-rndstr';

export const meta = {
	tags: ['app'],

	requireCredential: false,

	params: {
		name: {
			validator: $.str
		},

		description: {
			validator: $.str
		},

		permission: {
			validator: $.arr($.str).unique()
		},

		// TODO: Check it is valid url
		callbackUrl: {
			validator: $.optional.nullable.str,
			default: null as any
		},
	}
};

export default define(meta, async (ps, user) => {
	// Generate secret
	const secret = secureRndstr(32, true);

	let p = ps.permission;

	/*
	p = p.map(x => x
		// v11 => v10
		.replace('read:account', 'account-read')
		.replace('write:account', 'account-write')
		.replace('read:drive', 'drive-read')
		.replace('write:drive', 'drive-write')
		.replace('read:favorites', 'favorite-read')
		.replace('write:favorites', 'favorite-write')
		.replace('read:following', 'following-read')
		.replace('write:following', 'following-write')
		.replace('read:messaging', 'messaging-read')
		.replace('write:messaging', 'messaging-write')
		.replace('write:notes', 'note-write')
		.replace('read:notifications', 'notification-read')
		.replace('write:notifications', 'notification-write')
		.replace('read:reactions', 'reaction-read')
		.replace('write:reactions', 'reaction-write')
		.replace('write:votes', 'vote-write')
	);
	*/

	// v10 typos
	/*
	if (p.includes('favorites-read')) p.push('favorite-read');
	if (p.includes('favorite-read')) p.push('favorites-read');
	if (p.includes('account/read')) p.push('account-read');
	if (p.includes('account-read')) p.push('account/read');
	if (p.includes('account/write')) p.push('account-write');
	if (p.includes('account-write')) p.push('account/write');
	*/

	// 今のv10にはなし
	// 'note-read', 'vote-read',

	// v11にしかない
	// 'read:blocks', 'write:blocks', 'read:mutes', 'write:mutes'
	// pages, groups

	p = unique(p);

	// Create account
	const app = await App.insert({
		createdAt: new Date(),
		userId: user && user._id,
		name: ps.name,
		description: ps.description,
		permission: p,
		callbackUrl: ps.callbackUrl,
		secret: secret
	});

	return await pack(app, null, {
		detail: true,
		includeSecret: true
	});
});
