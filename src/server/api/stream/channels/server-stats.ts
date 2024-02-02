import autobind from 'autobind-decorator';
import Xev from 'xev';
import Channel from '../channel';
import config from '../../../../config';

const ev = new Xev();

export default class extends Channel {
	public readonly chName = 'serverStats';
	public static requireCredential = false;

	@autobind
	public async init(params: any) {
		ev.addListener('serverStats', this.onStats);
	}

	@autobind
	private onStats(stats: any) {
		if (config.hideServerInfo) return;
		this.send('stats', stats);
	}

	@autobind
	public onMessage(type: string, body: any) {
		if (config.hideServerInfo) return;
		switch (type) {
			case 'requestLog':
				ev.once(`serverStatsLog:${body.id}`, statsLog => {
					this.send('statsLog', statsLog);
				});
				ev.emit('requestServerStatsLog', {
					id: body.id,
					length: body.length
				});
				break;
		}
	}

	@autobind
	public dispose() {
		ev.removeListener('serverStats', this.onStats);
	}
}
