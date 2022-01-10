import User, { ILocalUser } from '../models/user';
import { createSystemUser } from './create-system-user';
import Emoji, { IEmoji } from '../models/emoji';
import { uploadFromUrl } from './drive/upload-from-url';
import getDriveFileUrl from '../misc/get-drive-file-url';

const ACTOR_USERNAME = 'system.1' as const;

export async function getSystem1(): Promise<ILocalUser> {
	const user = await User.findOne({
		host: null,
		username: ACTOR_USERNAME
	});

	if (user) return user as ILocalUser;

	const created = await createSystemUser(ACTOR_USERNAME);
	return created as ILocalUser;
}

export async function tryStockEmoji(emoji: IEmoji) {
	if (emoji.host == null) {
		//console.log(`islocal`);
		return;
	}

	if (emoji.saved && emoji.md5 != null) {
		//console.log(`saved`);
		return;
	}

	return await stockEmoji(emoji);
}

export async function stockEmoji(emoji: IEmoji) {
	const user = await getSystem1();
	const file = await uploadFromUrl(emoji.url, user, null, null, false, true);

	const url = getDriveFileUrl(file);

	if (!url) {
		//console.log(`!url`);
		return;
	}

	console.log(`saved remote emoji: ${emoji.url} => ${url}`);

	await Emoji.update({ _id: emoji._id }, {
		$set: {
			url,
			md5: file.md5,
			saved: true
		}
	});
}
