import $ from 'cafy';
import ID, { transform } from '../../../../misc/cafy-id';
import * as ms from 'ms';
import { length } from 'stringz';
import Note, { isValidCw } from '../../../../models/note';
import define from '../../define';
import fetchMeta from '../../../../misc/fetch-meta';
import { ApiError } from '../../error';
import { GetterError, getNote } from '../../common/getters';
import { publishNoteStream } from '../../../../services/stream';
import { oidEquals } from '../../../../prelude/oid';
import renderNote from '../../../../remote/activitypub/renderer/note';
import User, { IRemoteUser } from '../../../../models/user';
import DeliverManager from '../../../../remote/activitypub/deliver-manager';
import { deliverToRelays } from '../../../../services/relay';
import renderUpdate from '../../../../remote/activitypub/renderer/update';
import { renderActivity } from '../../../../remote/activitypub/renderer';

let maxNoteTextLength = 1000;

setInterval(() => {
	fetchMeta().then(m => {
		maxNoteTextLength = m.maxNoteTextLength || maxNoteTextLength;
	});
}, 60000);

export const meta = {
	desc: {
		'ja-JP': '更新します。'
	},

	tags: ['notes'],

	requireCredential: true,

	limit: {
		duration: ms('1hour'),
		max: 300
	},

	kind: ['write:notes', 'note-write'],

	params: {
		noteId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象の投稿のID',
			}
		},

		text: {
			validator: $.optional.nullable.str.pipe(text =>
				length(text?.trim()) <= maxNoteTextLength
					&& length(text?.trim()) >= 1	// 更新の場合は空にできないことにする
			),
			default: null as any,
			desc: {
				'ja-JP': '投稿内容'
			}
		},

		cw: {
			validator: $.optional.nullable.str.pipe(isValidCw),
			desc: {
				'ja-JP': 'コンテンツの警告。このパラメータを指定すると設定したテキストで投稿のコンテンツを隠す事が出来ます。'
			}
		},
	},

	errors: {
		noSuchNote: {
			message: 'No such note.',
			code: 'NO_SUCH_NOTE',
			id: 'a6584e14-6e01-4ad3-b566-851e7bf0d474',
		},
	}
};

export default define(meta, async (ps, user, app) => {
	// check note
	const origin = await getNote(ps.noteId, user).catch(e => {
		if (e instanceof GetterError && e.type === 'noSuchNote') throw new ApiError(meta.errors.noSuchNote);
		throw e;
	});

	// check note owner
	if (!oidEquals(origin.userId, user._id)) {
		throw new ApiError(meta.errors.noSuchNote);
	}

	// Update
	const updates = {
		updatedAt: new Date(),
		text: ps.text?.trim(),
		cw: ps.cw ?? null,
	};

	await Note.update({ _id: origin._id }, {
		$set: updates
	});

	// Publish to streaming
	publishNoteStream(origin._id, 'updated', updates);

	// AP Deliver
	(async () => {
		if (user.noFederation) return;
		if (origin.localOnly) return;

		const note = await Note.findOne({ _id: origin._id });
		if (!note) return;

		const activity = renderActivity(renderUpdate(await renderNote(note), user));

		const dm = new DeliverManager(user, activity);

		// メンションされたリモートユーザーに配送
		for (const u of (note.mentionedRemoteUsers || [])) {
			dm.addDirectRecipe(await User.findOne({ _id: u }) as IRemoteUser);
		}

		// リプライ先
		if (note._reply?.user.host) {
			dm.addDirectRecipe(await User.findOne({ _id: note._reply.user }) as IRemoteUser);
		}

		// Renote/Quote先
		if (note._renote?.user.host) {
			dm.addDirectRecipe(await User.findOne({ _id: note._renote.user }) as IRemoteUser);
		}

		// フォロワーへ配送
		if (['public', 'home', 'followers'].includes(note.visibility)) {
			dm.addFollowersRecipe();
		}

		// リレーへ配送
		if (['public'].includes(note.visibility) && !note.copyOnce) {
			deliverToRelays(user, activity);
		}

		// リモートのみ配送
		if (note.visibility === 'specified' && note.copyOnce) {
			dm.addFollowersRecipe();
		}

		dm.execute();
	})();
});
