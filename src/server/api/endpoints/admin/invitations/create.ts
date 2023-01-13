import $ from 'cafy';
import define from '../../../define';
import RegistrationTicket, { packRegistrationTicket } from '../../../../../models/registration-tickets';
import rndstr from 'rndstr';

export const meta = {
	desc: {
		'ja-JP': '招待コードを発行します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		expiredAfter: {
			validator: $.optional.nullable.num.int().min(1),
			desc: {
				'ja-JP': '使用期限 (ミリ秒)'
			}
		},
		restCount: {
			validator: $.optional.num.range(1, 100),
			default: 1,
			desc: {
				'ja-JP': '使用可能数'
			}
		},
	}
};

export default define(meta, async (ps, user) => {
	const code = rndstr({ length: 6, chars: '0-9' });

	const inserted = await RegistrationTicket.insert({
		createdAt: new Date(),
		expiresAt: ps.expiredAfter && new Date(new Date().getTime() + ps.expiredAfter),
		restCount: ps.restCount,
		inviterId: user._id,
		code: code
	});

	return await packRegistrationTicket(inserted);
});
