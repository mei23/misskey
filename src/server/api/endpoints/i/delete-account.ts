import $ from 'cafy';
import * as bcrypt from 'bcryptjs';
import User from '../../../../models/user';
import define from '../../define';
import { createDeleteNotesJob, createDeleteDriveFilesJob } from '../../../../queue';
import Message from '../../../../models/messaging-message';
import Signin from '../../../../models/signin';
import { doPostSuspend } from '../../../../services/suspend-user';
import { publishTerminate } from '../../../../services/server-event';
import { ApiError } from '../../error';

export const meta = {
	requireCredential: true,

	secure: true,

	params: {
		password: {
			validator: $.str
		},
	},

	errors: {
		incorrectPassword: {
			message: 'Incorrect password',
			code: 'INCORRECT_PASSWORD',
			id: 'c6c69c2d-1f58-4850-bb05-40db158b9de2'
		},
	},
};

export default define(meta, async (ps, user) => {
	// Compare password
	const same = await bcrypt.compare(ps.password, user.password);

	if (!same) {
		throw new ApiError(meta.errors.incorrectPassword);
	}

	await User.update({ _id: user._id }, {
		$set: {
			isDeleted: true,
			name: null,
			description: null,
			pinnedNoteIds: [],
			password: null,
			email: null,
			twitter: null,
			github: null,
			discord: null,
			profile: {},
			fields: [],
			clientSettings: {},
		}
	});

	// Terminate streaming
	publishTerminate(user._id);

	Message.remove({ userId: user._id });
	Signin.remove({ userId: user._id });
	createDeleteNotesJob(user);
	createDeleteDriveFilesJob(user);
	doPostSuspend(user);

	return;
});
