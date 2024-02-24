import $ from 'cafy';
import define from '../../define';
import User from '../../../../models/user';
import Message from '../../../../models/messaging-message';
import { doPostSuspend } from '../../../../services/suspend-user';
import { createDeleteNotesJob, createDeleteDriveFilesJob } from '../../../../queue';
import { toDbHost } from '../../../../misc/convert-host';
import { isBlockedHost, isClosedHost } from '../../../../services/instance-moderation';
import { ApiError } from '../../error';

export const meta = {
	desc: {
		'ja-JP': '',
		'en-US': ''
	},

	tags: ['admin'],

	requireCredential: true,
	requireModerator: true,

	params: {
		host: {
			validator: $.str.min(1),
			desc: {
				'ja-JP': 'Host',
				'en-US': 'Host'
			}
		},

		limit: {
			validator: $.optional.num.range(1, 1000),
			default: 50,
		},
	},

	errors: {
		hostIsAvailable: {
			message: 'Host is available.',
			code: 'HOST_IS_AVAILABLE',
			id: '66dcfd00-1905-4e89-b2ac-b588fb1348fd'
		},
	},
};

export default define(meta, async (ps) => {
	const host = toDbHost(ps.host);

	if (!await isBlockedHost(host) && !await isClosedHost(host)) throw new ApiError(meta.errors.hostIsAvailable);

	const users = await User.find({
		host,
		isDeleted: { $ne: true },
	}, {
		limit: ps.limit,
	});

	for (const user of users) {
		console.log(`delete user: ${user.username}@${user.host}`);

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

		await Message.remove({ userId: user._id });
		await createDeleteNotesJob(user);
		await createDeleteDriveFilesJob(user);
		await doPostSuspend(user, true);
	}
});
