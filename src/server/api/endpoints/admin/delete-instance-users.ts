import $ from 'cafy';
import define from '../../define';
import User from '../../../../models/user';
import Message from '../../../../models/messaging-message';
import { doPostSuspend } from '../../../../services/suspend-user';
import { createDeleteNotesJob, createDeleteDriveFilesJob } from '../../../../queue';
import { toDbHost } from '../../../../misc/convert-host';
import Instance from '../../../../models/instance';

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
	}
};

export default define(meta, async (ps) => {
	const host = toDbHost(ps.host);

	const instance = await Instance.findOne({
		host
	});

	if (instance == null) throw 'instance not found';
	if (!instance.isBlocked && !instance.isMarkedAsClosed) throw 'instance はブロックでもクローズでもない';

	const users = await User.find({
		host,
		isDeleted: { $ne: true },
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
		await doPostSuspend(user);
	}
});
