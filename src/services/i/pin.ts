import config from '../../config';
import * as mongo from 'mongodb';
import User, { isLocalUser, IUser } from '../../models/user';
import Note, { packMany } from '../../models/note';
import renderAdd from '../../remote/activitypub/renderer/add';
import renderRemove from '../../remote/activitypub/renderer/remove';
import { renderActivity } from '../../remote/activitypub/renderer';
import { IdentifiableError } from '../../misc/identifiable-error';
import { deliverToFollowers } from '../../remote/activitypub/deliver-manager';
import { deliverToRelays } from '../relay';

/**
 * 指定した投稿をピン留めします
 * @param user
 * @param noteId
 */
export async function addPinned(user: IUser, noteId: mongo.ObjectID) {
	// Fetch pinee
	const note = await Note.findOne({
		_id: noteId,
		visibility: { $in: ['public', 'home'] },
		localOnly: { $ne: true },
		userId: user._id
	});

	if (note === null) {
		throw new IdentifiableError('70c4e51f-5bea-449c-a030-53bee3cce202', 'No such note.');
	}

	let pinnedNoteIds = user.pinnedNoteIds || [];

	//#region 現在ピン留め投稿している投稿が実際にデータベースに存在しているのかチェック
	// データベースの欠損などで存在していない(または破損している)場合があるので。
	// 存在していなかったらピン留め投稿から外す
	let pinnedNotes = await packMany(pinnedNoteIds, null, { detail: true, removeError: true });

	// 削除済みもこのタイミングで消してしまう
	pinnedNotes = pinnedNotes.filter(x => !x.deletedAt);

	pinnedNoteIds = pinnedNoteIds.filter(id => pinnedNotes.some(n => id.equals(n.id)));
	//#endregion

	if (pinnedNoteIds.length >= 5) {
		throw new IdentifiableError('15a018eb-58e5-4da1-93be-330fcc5e4e1a', 'You can not pin notes any more.');
	}

	if (pinnedNoteIds.some(id => id.equals(note._id))) {
		throw new IdentifiableError('23f0cf4e-59a3-4276-a91d-61a5891c1514', 'That note has already been pinned.');
	}

	pinnedNoteIds.unshift(note._id);

	await User.update(user._id, {
		$set: {
			pinnedNoteIds: pinnedNoteIds
		}
	});

	// Deliver to remote followers
	if (isLocalUser(user)) {
		deliverPinnedChange(user._id, note._id, true);
	}
}

/**
 * 指定した投稿のピン留めを解除します
 * @param user
 * @param noteId
 */
export async function removePinned(user: IUser, noteId: mongo.ObjectID) {
	// Fetch unpinee
	const note = await Note.findOne({
		_id: noteId,
		userId: user._id
	});

	if (note === null) {
		throw new IdentifiableError('b302d4cf-c050-400a-bbb3-be208681f40c', 'No such note.');
	}

	const pinnedNoteIds = (user.pinnedNoteIds || []).filter(id => !id.equals(note._id));

	await User.update(user._id, {
		$set: {
			pinnedNoteIds: pinnedNoteIds
		}
	});

	// Deliver to remote followers
	if (isLocalUser(user)) {
		deliverPinnedChange(user._id, noteId, false);
	}
}

export async function deliverPinnedChange(userId: mongo.ObjectID, noteId: mongo.ObjectID, isAddition: boolean) {
	const user = await User.findOne({
		_id: userId
	});

	if (!isLocalUser(user)) return;

	const target = `${config.url}/users/${user._id}/collections/featured`;

	const item = `${config.url}/notes/${noteId}`;
	const content = renderActivity(isAddition ? renderAdd(user, target, item) : renderRemove(user, target, item));

	deliverToFollowers(user, content);
	deliverToRelays(user, content);
}
