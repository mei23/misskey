import autobind from 'autobind-decorator';
import Channel from '../channel';
import { MainStreamEvent } from '../types';

export default class extends Channel {
	public readonly chName = 'main';
	public static requireCredential = true;

	@autobind
	public async init(params: any) {
		// Subscribe main stream channel
		this.subscriber.on(`mainStream:${this.user!._id}`, async (data: MainStreamEvent) => {
			// filter
			if (data.type === 'notification') {
				const notification = data.body;
				if (this.mutedUserIds.includes(notification.userId)) return;
				if (notification.note?.isHidden) return;
			}

			if (data.type === 'mention') {
				const note = data.body;
				if (this.mutedUserIds.includes(note.userId)) return;
				if (note.isHidden) return;
			}

			this.send(data.type, data.body);
		});
	}
}
