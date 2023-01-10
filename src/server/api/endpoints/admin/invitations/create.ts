import define from '../../../define';
import RegistrationTicket from '../../../../../models/registration-tickets';
import rndstr from 'rndstr';

export const meta = {
	desc: {
		'ja-JP': '招待コードを発行します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {}
};

export default define(meta, async (ps, user) => {
	const code = rndstr({ length: 5, chars: '0-9' });

	await RegistrationTicket.insert({
		createdAt: new Date(),
		userId: user._id,
		code: code
	});

	return {
		code: code
	};
});
