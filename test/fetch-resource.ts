/*
 * Tests for Fetch resource
 *
 * How to run the tests:
 * > TS_NODE_FILES=true npx mocha test/fetch-resource.ts --require ts-node/register
 *
 * To specify test:
 * > TS_NODE_FILES=true npx mocha test/fetch-resource.ts --require ts-node/register -g 'test name'
 */

process.env.NODE_ENV = 'test';

import * as assert from 'assert';
import * as childProcess from 'child_process';
import { async, startServer, signup, post, api, simpleGet, port, shutdownServer, getDocument, uploadFile } from './utils';
import * as openapi from '@redocly/openapi-core';

const db = require('../built/db/mongodb').default;

// Request Accept
const ONLY_AP = 'application/activity+json';
const PREFER_AP = 'application/activity+json, */*';
const PREFER_HTML = 'text/html, */*';
const UNSPECIFIED = '*/*';

// Response Contet-Type
const AP = 'application/activity+json; charset=utf-8';
const JSON = 'application/json; charset=utf-8';
const HTML = 'text/html; charset=utf-8';

describe('Fetch resource', () => {
	let p: childProcess.ChildProcess;

	let admin: any;
	let instanceBanner: any;
	let instance: any;

	let alice: any;
	let avatar: any;
	let alicesPost: any;
	let image: any;
	let alicesPostImage: any;
	let video: any;
	let alicesPostVideo: any;

	before(async () => {
		p = await startServer();
		await Promise.all([
			db.get('users').drop(),
			db.get('notes').drop(),
		]);

		// admin
		admin = await signup({ username: 'admin' });

		// upload instance banner
		instanceBanner = await uploadFile(admin);
		//console.log('instanceBanner', instanceBanner);

		// update instance
		await api('admin/update-meta', {
			name: 'Instance Name',
			description: 'Instance Desc',
			bannerUrl: instanceBanner.url,
		}, admin);

		instance = (await api('meta', {})).body;
		//console.log('instance', instance);

		// signup
		alice = await signup({ username: 'alice' });
		//console.log('alice', alice);

		// upload avatar
		avatar = await uploadFile(alice);
		//console.log('avatar', avatar);

		// update profile
		const token = alice.token;

		const res = await api('i/update', {
			name: 'Alice',
			description: 'Alice Desc',
			avatarId: avatar.id,
		}, alice);

		alice = res.body;
		alice.token = token;	// tokenはsignup以外では返ってこない
		//console.log('alice-2', alice);

		// post
		alicesPost = await post(alice, {
			text: 'test',
		});
		//console.log('alicesPost', alicesPost);

		// upload image
		image = await uploadFile(alice);
		//console.log('image', image);

		// post image
		alicesPostImage = await post(alice, {
			text: 'image',
			fileIds: [ image.id ],
		});
		//console.log('alicesPostImage', alicesPostImage);

		// upload video
		video = await uploadFile(alice, 'anime.mp4');
		//console.log('video', video);

		// post video
		alicesPostVideo = await post(alice, {
			text: 'video',
			fileIds: [ video.id ],
		});
		//console.log('alicesPostVideo', alicesPostVideo);
	});

	after(async () => {
		await shutdownServer(p);
	});

	describe('Common', () => {
		it('meta', async(async () => {
			const res = await api('meta', {
			});

			assert.strictEqual(res.status, 200);
		}));

		it('GET root', async(async () => {
			const res = await simpleGet('/');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));

		it('GET docs', async(async () => {
			const res = await simpleGet('/docs/ja-JP/about');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));

		it('GET api-doc', async(async () => {
			const res = await simpleGet('/api-doc');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));

		it('GET api.json', async(async () => {
			const res = await simpleGet('/api.json');
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, JSON);
		}));

		it('Validate api.json', async(async () => {
			const config = await openapi.loadConfig();
			const result = await openapi.bundle({
				config,
				ref: `http://localhost:${port}/api.json`
			});

			for (const problem of result.problems) {
				console.log(`${problem.message} - ${problem.location[0]?.pointer}`);
			}

			assert.strictEqual(result.problems.length, 0);
		}));
	});

	describe('/@:username', () => {
		it('Only AP => AP', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, ONLY_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer AP => AP', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, PREFER_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer HTML => HTML', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, PREFER_HTML);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));

		it('Unspecified => HTML', async(async () => {
			const res = await simpleGet(`/@${alice.username}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));
	});

	describe('/users/:id', () => {
		it('Only AP => AP', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, ONLY_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer AP => AP', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, PREFER_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer HTML => Redirect to /@:username', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, PREFER_HTML);
			assert.strictEqual(res.status, 302);
			assert.strictEqual(res.location, `/@${alice.username}`);
		}));

		it('Undecided => AP', async(async () => {
			const res = await simpleGet(`/users/${alice.id}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));
	});

	describe('/notes/:id', () => {
		it('Only AP => AP', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, ONLY_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer AP => AP', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, PREFER_AP);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, AP);
		}));

		it('Prefer HTML => HTML', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, PREFER_HTML);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));

		it('Unspecified => HTML', async(async () => {
			const res = await simpleGet(`/notes/${alicesPost.id}`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, HTML);
		}));
	});

	describe('Feeds', () => {
		it('RSS', async(async () => {
			const res = await simpleGet(`/@${alice.username}.rss`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'application/rss+xml; charset=utf-8');
		}));

		it('ATOM', async(async () => {
			const res = await simpleGet(`/@${alice.username}.atom`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'application/atom+xml; charset=utf-8');
		}));

		it('JSON', async(async () => {
			const res = await simpleGet(`/@${alice.username}.json`, UNSPECIFIED);
			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.type, 'application/json; charset=utf-8');
		}));
	});

	describe('HTML meta', () => {
		const parse = (doc: Document) => {
			return {
				// Title
				'title': doc.querySelector('title')?.textContent,
				'og:title': doc.querySelector('meta[property="og:title"]')?.getAttribute('content'),
				'og:site_name': doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content'),

				// Description
				'description': doc.querySelector('meta[name=description]')?.getAttribute('content'),
				'og:description': doc.querySelector('meta[property="og:description"]')?.getAttribute('content'),

				// Twitter card
				'twitter:card': doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content'),

				// Misskey
				'misskey:user-username': doc.querySelector('meta[name="misskey:user-username"]')?.getAttribute('content'),
				'misskey:user-id': doc.querySelector('meta[name="misskey:user-id"]')?.getAttribute('content'),

				// Generic - og
				'og:url': doc.querySelector('meta[property="og:url"]')?.getAttribute('content'),
				'og:image': doc.querySelector('meta[property="og:image"]')?.getAttribute('content'),
				'og:published_time': doc.querySelector('meta[property="og:published_time"]')?.getAttribute('content'),

				// Player - Twitter
				'twitter:player': doc.querySelector('meta[name="twitter:player"]')?.getAttribute('content'),
				'twitter:player:width': doc.querySelector('meta[name="twitter:player:width"]')?.getAttribute('content'),
				'twitter:player:height': doc.querySelector('meta[name="twitter:player:height"]')?.getAttribute('content'),
				'twitter:player:stream': doc.querySelector('meta[name="twitter:player:stream"]')?.getAttribute('content'),
				'twitter:player:stream:content_type': doc.querySelector('meta[name="twitter:player:stream:content_type"]')?.getAttribute('content'),

				// Player - og
				'og:video:url': doc.querySelector('meta[property="og:video:url"]')?.getAttribute('content'),
				'og:video:secure_url': doc.querySelector('meta[property="og:video:secure_url"]')?.getAttribute('content'),
				'og:video:type': doc.querySelector('meta[property="og:video:type"]')?.getAttribute('content'),
				'og:video:width': doc.querySelector('meta[property="og:video:width"]')?.getAttribute('content'),
				'og:video:height': doc.querySelector('meta[property="og:video:height"]')?.getAttribute('content'),
			};
		}

		it('/', async(async () => {
			const parsed = parse(await getDocument('/'));

			assert.deepStrictEqual(parsed, {
				'title': instance.name,
				'og:title': instance.name,
				'og:site_name': instance.name,
				'description': instance.description,
				'og:description': instance.description,
				'twitter:card': 'summary',
				'misskey:user-username': undefined,
				'misskey:user-id': undefined,
				'og:url': undefined,
				'og:image': instanceBanner.url,
				'og:published_time': undefined,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('user', async(async () => {
			const parsed = parse(await getDocument(`/@${alice.username}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': alice.description,
				'og:description': alice.description,
				'twitter:card': 'summary',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/@${alice.username}`,
				'og:image': alice.avatarUrl,
				'og:published_time': undefined,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('note', async(async () => {
			const parsed = parse(await getDocument(`/notes/${alicesPost.id}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': alicesPost.text,
				'og:description': alicesPost.text,
				'twitter:card': 'summary',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/notes/${alicesPost.id}`,
				'og:image': alice.avatarUrl,
				'og:published_time': alicesPost.createdAt,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('note with image', async(async () => {
			const parsed = parse(await getDocument(`/notes/${alicesPostImage.id}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': `${alicesPostImage.text} (📎1)`,
				'og:description': `${alicesPostImage.text} (📎1)`,
				'twitter:card': 'summary',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/notes/${alicesPostImage.id}`,
				'og:image': alicesPostImage.files[0].thumbnailUrl,
				'og:published_time': alicesPostImage.createdAt,
				'twitter:player': undefined,
				'twitter:player:width': undefined,
				'twitter:player:height': undefined,
				'twitter:player:stream': undefined,
				'twitter:player:stream:content_type': undefined,
				'og:video:url': undefined,
				'og:video:secure_url': undefined,
				'og:video:type': undefined,
				'og:video:width': undefined,
				'og:video:height': undefined,
			});
		}));

		it('note with video', async(async () => {
			const parsed = parse(await getDocument(`/notes/${alicesPostVideo.id}`));

			assert.deepStrictEqual(parsed, {
				'title': `${alice.name} (@${alice.username}) | ${instance.name}`,
				'og:title': `${alice.name} (@${alice.username})`,
				'og:site_name': instance.name,
				'description': `${alicesPostVideo.text} (📎1)`,
				'og:description': `${alicesPostVideo.text} (📎1)`,
				'twitter:card': 'player',
				'misskey:user-username': alice.username,
				'misskey:user-id': alice.id,
				'og:url': `http://misskey.local/notes/${alicesPostVideo.id}`,
				'og:image': alicesPostVideo.files[0].thumbnailUrl,
				'og:published_time': alicesPostVideo.createdAt,
				'twitter:player':  `http://misskey.local/notes/${alicesPostVideo.id}/embed`,
				'twitter:player:width': '530',
				'twitter:player:height': '255',
				'twitter:player:stream': alicesPostVideo.files[0].url,
				'twitter:player:stream:content_type': alicesPostVideo.files[0].type,
				'og:video:url': `http://misskey.local/notes/${alicesPostVideo.id}/embed`,
				'og:video:secure_url': `http://misskey.local/notes/${alicesPostVideo.id}/embed`,
				'og:video:type': 'text/html',
				'og:video:width': '530',
				'og:video:height': '255',
			});
		}));
	});
});
