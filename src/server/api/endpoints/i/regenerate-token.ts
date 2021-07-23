import $ from 'cafy';
import * as bcrypt from 'bcryptjs';
import User from '../../../../models/user';
import { publishMainStream } from '../../../../services/stream';
import generateUserToken from '../../common/generate-native-user-token';
import define from '../../define';
import { publishTerminate } from '../../../../services/server-event';

export const meta = {
	requireCredential: true,

	secure: true,

	params: {
		password: {
			validator: $.str
		}
	}
};

export default define(meta, async (ps, user) => {
	// Compare password
	const same = await bcrypt.compare(ps.password, user.password);

	if (!same) {
		throw new Error('incorrect password');
	}

	// Generate secret
	const secret = generateUserToken();

	await User.update(user._id, {
		$set: {
			'token': secret
		}
	});

	// Publish event
	publishMainStream(user._id, 'myTokenRegenerated');

	// Terminate streaming
	setTimeout(() => {
		publishTerminate(user._id);
	}, 5000);

	return;
});
