import config from '../config';
import * as IPCIDR from 'ip-cidr';
const PrivateIp = require('private-ip');

export function checkPrivateIp(ip: string | undefined): boolean {
	if ((process.env.NODE_ENV === 'production') && !config.proxy && ip) {
		// check exclusion
		for (const net of config.allowedPrivateNetworks || []) {
			const cidr = new IPCIDR(net);
			if (cidr.contains(ip)) {
				return false;
			}
		}

		return PrivateIp(ip);
	} else {
		return false;
	}
}
