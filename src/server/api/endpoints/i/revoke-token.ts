import $ from 'cafy';
import define from '../../define';
//import { AccessTokens } from '../../../../models';
import ID, { transform } from '../../../../misc/cafy-id';
import AccessToken from '../../../../models/access-token';
import { publishTerminate } from '../../../../services/server-event';

export const meta = {
	requireCredential: true as const,

	secure: true,

	params: {
		tokenId: {
			validator: $.type(ID),
			transform: transform,
			desc: {
				'ja-JP': '対象のtokenのID',
				'en-US': 'Target token ID'
			}
		}
	}
};

export default define(meta, async (ps, user) => {
	await AccessToken.remove({
		_id: ps.tokenId,
		userId: user._id
	});

	// Terminate streaming
	publishTerminate(user._id);
});
