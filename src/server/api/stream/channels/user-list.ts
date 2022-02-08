import autobind from 'autobind-decorator';
import Channel from '../channel';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import UserList, { IUserList } from '../../../../models/user-list';
import config from '../../../../config';
import UserFilter from '../../../../models/user-filter';
import { oidIncludes, oidEquals } from '../../../../prelude/oid';
import Following from '../../../../models/following';
import { PackedNote } from '../../../../models/packed-schemas';

export default class extends Channel {
	public readonly chName = 'userList';
	public static requireCredential = false;
	private listId: string;
	public list: IUserList = null;

	private hideRenoteUsers: string[] = [];
	private followingIds: string[] = [];
	private includeForeignReply = false;

	private refreshClock: NodeJS.Timer;

	@autobind
	public async init(params: any) {
		this.listId = params.listId;

		await this.refreshLists();

		const followings = await Following.find({
			followerId: this.user._id
		});

		this.followingIds = followings.map(x => `${x.followeeId}`);

		this.includeForeignReply = !!params?.includeForeignReply;

		// Subscribe stream
		if (this.list) {
			this.subscriber.on(`userListStream:${this.listId}`, this.send);
			this.subscriber.on('notesStream', this.onNote);

			this.refreshClock = setInterval(this.refreshLists, 60000);
		}
	}

	@autobind
	private async refreshLists() {
		const hideRenotes = await UserFilter.find({
			ownerId: this.user._id,
			hideRenote: true
		});

		this.hideRenoteUsers = hideRenotes.map(hideRenote => hideRenote.targetId).map(x => x.toString());

		this.list = await UserList.findOne({
			_id: this.listId,
			userId: this.user._id
		});
	}

	@autobind
	private async onNote(note: PackedNote) {
		if (this.list.mediaOnly) {
			const medias = ['image/jpeg', 'image/png', 'image/apng', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'];
			const types = ((note.files || []) as any[]).map(x => x.type);
			if (!medias.some(x => types.includes(x))) return;
		}

		if (!(
			this.list.hosts && this.list.hosts.includes('*') ||
			this.list.userIds.some(userId => `${note.userId}` === `${userId}`) ||
			this.list.hosts && this.list.hosts.includes(note.user.host || config.host)
		)) return;

		if (['followers', 'specified'].includes(note.visibility)) {
			note = await pack(note.id, this.user, {
				detail: true
			});

			if (note.isHidden) {
				return;
			}
		}

		// リプライなら再pack
		if (note.replyId != null) {
			note.reply = await pack(note.replyId, this.user, {
				detail: true
			});
		}
		// Renoteなら再pack
		if (note.renoteId != null) {
			note.renote = await pack(note.renoteId, this.user, {
				detail: true
			});
		}

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (shouldMuteThisNote(note, this.mutedUserIds)) return;

		// Renoteを隠すユーザー
		if (note.renoteId && !note.text && !note.fileIds?.length && !note.poll) {	// pure renote
			if (oidIncludes(this.hideRenoteUsers, note.userId)) return;
		}

		if (!this.includeForeignReply && note.replyId) {
			if (!(
				oidEquals(note.userId, note.reply!.userId)
				|| oidEquals(this.user!._id, note.reply!.userId)	// to me
				|| oidEquals(this.user!._id, note.userId)	// my post
			)) return;
		}

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		if (this.list) {
			this.subscriber.off(`userListStream:${this.listId}`, this.send);
			this.subscriber.off('notesStream', this.onNote);
			clearInterval(this.refreshClock);
		}
	}
}
