import define from '../../../define';
import RegistrationTicket from '../../../../../models/registration-tickets';
import { pack } from '../../../../../models/user';
import { packedInvitation } from '../../../../../models/packed-schemas';

export const meta = {
	desc: {
		'ja-JP': '招待コードの一覧を返します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		// TODO: paging
	},

	errors: {
	},
};

export default define(meta, async (ps, user) => {
	const invirations = await RegistrationTicket.find({}, {
		sort: { _id: 'desc' }
	});

	return await Promise.all(invirations.map(async x => {
		return {
			id: x._id,
			createdAt: x.createdAt,
			inviterId: x.inviterId,
			inviteeIds: x.inviterId,
			inviter: x.inviterId && await pack(x.inviterId),
			invitees: x.inviteeIds && await Promise.all(x.inviteeIds.map(x => pack(x))),
			code: x.code,
		};
	}));
});
