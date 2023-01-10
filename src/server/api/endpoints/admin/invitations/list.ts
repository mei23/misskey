import define from '../../../define';
import RegistrationTicket from '../../../../../models/registration-tickets';
import { pack } from '../../../../../models/user';

export const meta = {
	desc: {
		'ja-JP': '招待コードの一覧を返します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
	},

	errors: {
	},
};

export default define(meta, async (ps, user) => {
	const invirations = await RegistrationTicket.find();

	return await Promise.all(invirations.map(async (x: any) => {
		x.id = `${x._id}`;
		delete x._id
		x.user = x.userId && await pack(x.userId);
		return x;
	}));
});
