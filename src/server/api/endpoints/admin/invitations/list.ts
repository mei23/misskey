import $ from 'cafy';
import define from '../../../define';
import RegistrationTicket, { packRegistrationTicket } from '../../../../../models/registration-tickets';

export const meta = {
	desc: {
		'ja-JP': '招待コードの一覧を返します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		limit: {
			validator: $.optional.num.range(1, 100),
			default: 10
		},
		offset: {
			validator: $.optional.num.min(0),
			default: 0
		},
	},

	errors: {
	},
};

export default define(meta, async (ps, user) => {
	const tickets = await RegistrationTicket.find({}, {
		sort: { _id: -1 },
		skip: ps.offset,
		limit: ps.limit,
	});

	return await Promise.all(tickets.map(x => packRegistrationTicket(x)));
});
