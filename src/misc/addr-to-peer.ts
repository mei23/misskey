import * as IPCIDR from 'ip-cidr';

export function addrToPeer(addr: string): string | null | undefined {
	if (addr == null) return addr;

	if (addr.includes(':')) {
		// v6は/64単位
		try {
			const cidr = new IPCIDR(`${addr}/64`);
			return cidr.start();
		} catch {
			return null;
		}
	} else {
		return addr;
	}
}
