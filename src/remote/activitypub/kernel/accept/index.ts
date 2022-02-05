import User, { ILocalUser, IRemoteUser } from '../../../../models/user';
import acceptFollow from './follow';
import { IAccept, isFollow, getApType } from '../../type';
import { apLogger } from '../../logger';
import * as escapeRegexp from 'escape-regexp';
import config from '../../../../config';
import * as mongo from 'mongodb';
import renderFollow from '../../renderer/follow';

const logger = apLogger;

export default async (actor: IRemoteUser, activity: IAccept): Promise<string> => {
	const uri = activity.id || activity;

	logger.info(`Accept: ${uri}`);

	let object;

	if (typeof activity.object !== 'string') {
		// こっちが投げたFollowオブジェクトをそのまま返してくれる場合は、オブジェクト内のこっちのユーザーを使う
		object = activity.object;
	} else {
		// stringで返されたら困ってしまうが、FollowオブジェクトのIDは https://local/followings-from/:id で送ることにしてでっち上げてしまう
		const match = activity.object.match(new RegExp('^' + escapeRegexp(config.url) + '/' + '(\\w+)' + '/' + '(\\w+)'));
		if (match && match[1] === 'followings_from') {
			const u = await User.findOne({
				_id: new mongo.ObjectID(match[2]),
				deletedAt: { $exists: false },
				host: null
			});

			if (u) {
				object = renderFollow(u as ILocalUser, actor);
			} else {
				return `skip: Local actor not found. (${activity.object})}`;
			}
		} else {
			return `skip: Not a local actor (${activity.object})`;
		}
	}

	if (isFollow(object)) return await acceptFollow(actor, object);

	return `skip: Unknown Accept type: ${getApType(object)}`;
};
