import * as os from 'os';
import * as systeminformation from 'systeminformation';
import * as diskusage from 'diskusage';
import * as Deque from 'double-ended-queue';
import Xev from 'xev';
import * as osUtils from 'os-utils';
import config from '../config';

const ev = new Xev();

const interval = 3000;

/**
 * Report server stats regularly
 */
export default function() {
	const log = new Deque<any>();

	ev.on('requestServerStatsLog', x => {
		ev.emit(`serverStatsLog:${x.id}`, log.toArray().slice(0, x.length || 50));
	});

	async function tick() {
		const cpu = await cpuUsage();
		const mem = await systeminformation.mem();
		const cpuSpeed = (await systeminformation.cpuCurrentSpeed()).avg;
		const disk = await diskusage.check(os.platform() == 'win32' ? 'c:' : '/');

		mem.used = mem.used - mem.buffers - mem.cached;
		// |- used -|- buffer-|- cache -|- free -|
		// |-- active --|-- available --|- free -|

		const stats = {
			cpu_usage: config.hideServerInfo ? -1 : cpu,
			cpu_speed: config.hideServerInfo ? -1 : cpuSpeed,
			mem: config.hideServerInfo ? -1 : mem,
			disk: config.hideServerInfo ? -1 : disk,
			os_uptime: config.hideServerInfo ? -1 : os.uptime(),
			process_uptime: config.hideServerInfo ? -1 : process.uptime()
		};
		ev.emit('serverStats', stats);
		log.unshift(stats);
		if (log.length > 200) log.pop();
	}

	tick();

	setInterval(tick, interval);
}

// CPU STAT
function cpuUsage() {
	return new Promise((res, rej) => {
		try {
			osUtils.cpuUsage((cpuUsage: number) => {
				res(cpuUsage);
			});
		} catch (e) {
			rej(e);
		}
	});
}
