import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import User, { isValidName, isValidDescription, isValidLocation, isValidBirthday, pack } from '../../../../models/user';
import { publishMainStream } from '../../../../services/stream';
import DriveFile from '../../../../models/drive-file';
import acceptAllFollowRequests from '../../../../services/following/requests/accept-all';
import { publishToFollowers } from '../../../../services/i/update';
import define from '../../define';
import getDriveFileUrl from '../../../../misc/get-drive-file-url';
import { parse, parsePlain } from '../../../../mfm/parse';
import extractEmojis from '../../../../misc/extract-emojis';
import extractHashtags from '../../../../misc/extract-hashtags';
import { updateUsertags } from '../../../../services/update-hashtag';
import { ApiError } from '../../error';
import { sendDeleteActivity } from '../../../../services/suspend-user';
import { doPostUnsuspend } from '../../../../services/unsuspend-user';

export const meta = {
	desc: {
		'ja-JP': 'アカウント情報を更新します。',
		'en-US': 'Update myself'
	},

	tags: ['account'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
		name: {
			validator: $.optional.nullable.str.pipe(isValidName),
			desc: {
				'ja-JP': '名前(ハンドルネームやニックネーム)'
			}
		},

		description: {
			validator: $.optional.nullable.str.pipe(isValidDescription),
			desc: {
				'ja-JP': 'アカウントの説明や自己紹介'
			}
		},

		location: {
			validator: $.optional.nullable.str.pipe(isValidLocation),
			desc: {
				'ja-JP': '住んでいる地域、所在'
			}
		},

		birthday: {
			validator: $.optional.nullable.str.pipe(isValidBirthday),
			desc: {
				'ja-JP': '誕生日 (YYYY-MM-DD形式)'
			}
		},

		avatarId: {
			validator: $.optional.nullable.type(ID),
			transform: transform,
			desc: {
				'ja-JP': 'アイコンに設定する画像のドライブファイルID'
			}
		},

		bannerId: {
			validator: $.optional.nullable.type(ID),
			transform: transform,
			desc: {
				'ja-JP': 'バナーに設定する画像のドライブファイルID'
			}
		},

		wallpaperId: {
			validator: $.optional.nullable.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '壁紙に設定する画像のドライブファイルID'
			}
		},

		isLocked: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': '鍵アカウントか否か'
			}
		},

		carefulBot: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'Botからのフォローを承認制にするか'
			}
		},

		carefulRemote: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'リモートからのフォローを承認制にするか'
			}
		},

		carefulMassive: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': '大量フォロワーのフォローを承認制にするか'
			}
		},

		autoAcceptFollowed: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'フォローしているユーザーからのフォローリクエストを自動承認するか'
			}
		},

		refuseFollow: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'refuseFollow'
			}
		},

		avoidSearchIndex: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'avoidSearchIndex'
			}
		},

		hideFollows: {
			validator: $.optional.nullable.str.or(['', 'follower', 'always']),
			desc: {
				'ja-JP': 'hide Follow/Follower list'
			}
		},

		noFederation: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'noFederation'
			}
		},

		isBot: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'Botか否か'
			}
		},

		isCat: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': '猫か否か'
			}
		},

		autoWatch: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': '投稿の自動ウォッチをするか否か'
			}
		},

		alwaysMarkNsfw: {
			validator: $.optional.bool,
			desc: {
				'ja-JP': 'アップロードするメディアをデフォルトで「閲覧注意」として設定するか'
			}
		},

		fields: {
			validator: $.optional.arr($.object()).range(1, 4),
			desc: {
				'ja-JP': 'fields'
			}
		},

		pushNotifications: {
			validator: $.optional.object({
				follow: $.optional.bool,
				mention: $.optional.bool,
				reply: $.optional.bool,
				renote: $.optional.bool,
				quote: $.optional.bool,
				reaction: $.optional.bool,
				poll_vote: $.optional.bool,
				poll_finished: $.optional.bool,
				highlight: $.optional.bool
			}),
			desc: {
				'ja-JP': 'オフラインプッシュ通知の対象'
			}
		},
	},

	errors: {
		noSuchAvatar: {
			message: 'No such avatar file.',
			code: 'NO_SUCH_AVATAR',
			id: '539f3a45-f215-4f81-a9a8-31293640207f'
		},

		noSuchBanner: {
			message: 'No such banner file.',
			code: 'NO_SUCH_BANNER',
			id: '0d8f5629-f210-41c2-9433-735831a58595'
		},

		avatarNotAnImage: {
			message: 'The file specified as an avatar is not an image.',
			code: 'AVATAR_NOT_AN_IMAGE',
			id: 'f419f9f8-2f4d-46b1-9fb4-49d3a2fd7191'
		},

		bannerNotAnImage: {
			message: 'The file specified as a banner is not an image.',
			code: 'BANNER_NOT_AN_IMAGE',
			id: '75aedb19-2afd-4e6d-87fc-67941256fa60'
		}
	}
};

export default define(meta, async (ps, user, app) => {
	const isSecure = user != null && app == null;

	const updates = {} as any;

	if (ps.name !== undefined) updates.name = ps.name;
	if (ps.description !== undefined) updates.description = ps.description;
	if (ps.location !== undefined) updates['profile.location'] = ps.location;
	if (ps.birthday !== undefined) updates['profile.birthday'] = ps.birthday;
	if (ps.avatarId !== undefined) updates.avatarId = ps.avatarId;
	if (ps.bannerId !== undefined) updates.bannerId = ps.bannerId;
	if (ps.wallpaperId !== undefined) updates.wallpaperId = ps.wallpaperId;
	if (typeof ps.isLocked == 'boolean') updates.isLocked = ps.isLocked;
	if (typeof ps.isBot == 'boolean') updates.isBot = ps.isBot;
	if (typeof ps.carefulBot == 'boolean') updates.carefulBot = ps.carefulBot;
	if (typeof ps.carefulRemote == 'boolean') updates.carefulRemote = ps.carefulRemote;
	if (typeof ps.carefulMassive == 'boolean') updates.carefulMassive = ps.carefulMassive;
	if (typeof ps.refuseFollow == 'boolean') updates.refuseFollow = ps.refuseFollow;
	if (typeof ps.autoAcceptFollowed == 'boolean') updates.autoAcceptFollowed = ps.autoAcceptFollowed;
	if (typeof ps.avoidSearchIndex == 'boolean') updates.avoidSearchIndex = ps.avoidSearchIndex;
	if (ps.hideFollows !== undefined) updates.hideFollows = ps.hideFollows;
	if (typeof ps.noFederation == 'boolean') updates.noFederation = ps.noFederation;
	if (typeof ps.isCat == 'boolean') updates.isCat = ps.isCat;
	if (typeof ps.autoWatch == 'boolean') updates['settings.autoWatch'] = ps.autoWatch;
	if (typeof ps.alwaysMarkNsfw == 'boolean') updates['settings.alwaysMarkNsfw'] = ps.alwaysMarkNsfw;
	if (ps.pushNotifications) updates['settings.pushNotifications'] = ps.pushNotifications;

	if (ps.avatarId) {
		const avatar = await DriveFile.findOne({
			_id: ps.avatarId
		});

		if (avatar == null) throw new ApiError(meta.errors.noSuchAvatar);
		if (!avatar.contentType.startsWith('image/')) throw new ApiError(meta.errors.avatarNotAnImage);

		if (avatar.metadata.deletedAt) {
			updates.avatarUrl = null;
		} else {
			updates.avatarUrl = getDriveFileUrl(avatar, true);

			if (avatar.metadata.properties.avgColor) {
				updates.avatarColor = avatar.metadata.properties.avgColor;
			}
		}
	}

	if (ps.bannerId) {
		const banner = await DriveFile.findOne({
			_id: ps.bannerId
		});

		if (banner == null) throw new ApiError(meta.errors.noSuchBanner);
		if (!banner.contentType.startsWith('image/')) throw new ApiError(meta.errors.bannerNotAnImage);

		if (banner.metadata.deletedAt) {
			updates.bannerUrl = null;
		} else {
			updates.bannerUrl = getDriveFileUrl(banner, false);

			if (banner.metadata.properties.avgColor) {
				updates.bannerColor = banner.metadata.properties.avgColor;
			}
		}
	}

	if (ps.wallpaperId !== undefined) {
		if (ps.wallpaperId === null) {
			updates.wallpaperUrl = null;
			updates.wallpaperColor = null;
		} else {
			const wallpaper = await DriveFile.findOne({
				_id: ps.wallpaperId
			});

			if (wallpaper == null) throw new Error('wallpaper not found');

			if (wallpaper.metadata.deletedAt) {
				updates.wallpaperUrl = null;
			} else {
				updates.wallpaperUrl = getDriveFileUrl(wallpaper);

				if (wallpaper.metadata.properties.avgColor) {
					updates.wallpaperColor = wallpaper.metadata.properties.avgColor;
				}
			}
		}
	}

	if (ps.fields) {
		updates.fields = ps.fields
			.filter(x => typeof x.name === 'string' && x.name !== '' && typeof x.value === 'string' && x.value !== '')
			.map(x => {
				return { name: x.name, value: x.value };
			});
	}

	//#region emojis/tags
	if (updates.name != null || updates.description != null) {
		let emojis = [] as string[];
		let tags = [] as string[];

		if (updates.name != null) {
			const tokens = parsePlain(updates.name);
			emojis = emojis.concat(extractEmojis(tokens));
		}

		if (updates.description != null) {
			const tokens = parse(updates.description);
			emojis = emojis.concat(extractEmojis(tokens));
			tags = extractHashtags(tokens).map(tag => tag.toLowerCase()).slice(0, 64);
		}

		updates.emojis = emojis;
		updates.tags = tags;

		// ハッシュタグ更新
		updateUsertags(user, tags);
	}
	//#endregion

	await User.update(user._id, {
		$set: updates
	});

	const iObj = await pack(user._id, user, {
		detail: true,
		includeSecrets: isSecure
	});

	// Publish meUpdated event
	publishMainStream(user._id, 'meUpdated', iObj);

	// 鍵垢を解除したとき、溜まっていたフォローリクエストがあるならすべて承認
	if (user.isLocked && ps.isLocked === false) {
		acceptAllFollowRequests(user);
	}

	if (typeof updates.noFederation !== 'undefined') {
		if (updates.noFederation) {
			sendDeleteActivity(user);
		} else {
			doPostUnsuspend(user);
		}
	} else {
		// フォロワーにUpdateを配信
		publishToFollowers(user._id);
	}

	return iObj;
});
