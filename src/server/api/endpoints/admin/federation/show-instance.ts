import $ from 'cafy';
import define from '../../../define';
import Instance from '../../../../../models/instance';
import { isBlockedHost, isSelfSilencedHost } from '../../../../../services/instance-moderation';

export const meta = {
	tags: ['federation'],

	requireCredential: true,
	requireModerator: true,

	params: {
		host: {
			validator: $.str
		}
	}
};

export default define(meta, async (ps, me) => {
	const instance = await Instance
		.findOne({ host: ps.host }) as Record<string, unknown>;
	
	instance.matchBlocked = await isBlockedHost(ps.host);
	instance.matchSelfSilenced = await isSelfSilencedHost(ps.host);

	return instance;
});
