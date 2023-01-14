import * as os from 'os';
import * as systeminformation from 'systeminformation';
const checkDiskSpace = require('check-disk-space').default;
import * as Deque from 'double-ended-queue';
import Xev from 'xev';
import * as osUtils from 'os-utils';
import config from '../config';

const ev = new Xev();

const interval = 3000;

type DiskUsage = {
	available: number;
	free: number;
	total: number;
};

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

		const _disk = await checkDiskSpace(os.platform() == 'win32' ? 'c:' : '/') as { diskPath: string; free: number; size: number; };
		const disk: DiskUsage = {
			available: _disk.free,
			free: _disk.free,
			total: _disk.size,
		};

		mem.used = mem.used - mem.buffers - mem.cached;
		// |- used -|- buffer-|- cache -|- free -|
		// |-- active --|-- available --|- free -|

		const stats = {
			cpu_usage: cpu,
			cpu_speed: cpuSpeed,
			mem,
			disk,
			os_uptime:  os.uptime(),
			process_uptime: process.uptime()
		};
		ev.emit('serverStats', stats);
		log.unshift(stats);
		if (log.length > 200) log.pop();
	}

	if (config.hideServerInfo) return;

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
