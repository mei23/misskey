import * as os from 'os';
import * as si from 'systeminformation';
import define from '../define';
import config from '../../../config';

export const meta = {
	requireCredential: false,
	allowGet: true,

	desc: {
	},

	tags: ['meta'],

	params: {
	},
};

export default define(meta, async () => {
	const memStats = await si.mem();
	const fsStats = await si.fsSize();

	return {
		machine: config.hideServerInfo ? 'Unknown' : os.hostname(),
		os: config.hideServerInfo ? 'Unknown' : os.platform(),
		node: config.hideServerInfo ? 'Unknown' : process.version,
		cpu: {
			model: config.hideServerInfo ? 'Unknown' : os.cpus()[0].model,
			cores: config.hideServerInfo ? 'Unknown' : os.cpus().length
		},
		mem: {
			total: config.hideServerInfo ? 'Unknown' : memStats.total
		},
		fs: {
			total: config.hideServerInfo ? 'Unknown' : fsStats[0].size,
			used: config.hideServerInfo ? 'Unknown' : fsStats[0].used,
		}
	};
});
