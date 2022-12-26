import autobind from 'autobind-decorator';
import { pack } from '../../../../models/note';
import shouldMuteThisNote from '../../../../misc/should-mute-this-note';
import Channel from '../channel';
import fetchMeta from '../../../../misc/fetch-meta';
import { PackedNote } from '../../../../models/packed-schemas';

export default class extends Channel {
	public readonly chName = 'localTimeline';
	public static requireCredential = false;

	private showReplayInPublicTimeline = false;

	@autobind
	public async init(params: any) {
		const meta = await fetchMeta();
		if (meta.disableLocalTimeline) {
			return;
		}
		if (!this.user && meta.disableTimelinePreview) {
			return;
		}
		this.showReplayInPublicTimeline = meta.showReplayInPublicTimeline;

		// Subscribe events
		this.subscriber.on('notesStream', this.onNote);

	}

	@autobind
	private async onNote(note: PackedNote) {
		if (note.visibility !== 'public') return;
		if (note.user!.host != null) return;
		if (!this.showReplayInPublicTimeline && note.replyId) return;
		if (note.hasRemoteMentions) return;

		// Renoteなら再pack
		if (note.renoteId != null) {
			note.renote = await pack(note.renoteId, this.user, {
				detail: true
			});
		}

		if (note.renote?.user?.host) return;

		// 流れてきたNoteがミュートしているユーザーが関わるものだったら無視する
		if (shouldMuteThisNote(note, this.mutedUserIds)) return;

		this.send('note', note);
	}

	@autobind
	public dispose() {
		// Unsubscribe events
		this.subscriber.off('notesStream', this.onNote);
	}
}
