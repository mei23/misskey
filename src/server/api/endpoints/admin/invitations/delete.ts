import define from '../../../define';
import $ from 'cafy';
import ID from '../../../../../misc/cafy-id';
import { ApiError } from '../../../error';
import RegistrationTicket from '../../../../../models/registration-tickets';

export const meta = {
	desc: {
		'ja-JP': '招待コードを削除します。'
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		id: {
			validator: $.type(ID)
		}
	},

	errors: {
		noSuchInvitation: {
			message: 'No such Invitation.',
			code: 'NO_SUCH_INVITATION',
			id: 'e90d5d7b-a4b6-4aaf-aba8-4f8db8b43a70'
		},
	},
};

export default define(meta, async (ps, user) => {
	const result = await RegistrationTicket.remove({
		_id: ps.id,
	});

	if (result.deletedCount === 0) {
		throw new ApiError(meta.errors.noSuchInvitation);
	}

	return;
});
