import config from '../../../config';
import { ILocalUser, IUser } from '../../../models/user';

export default (object: any, user: ILocalUser | IUser) => {
	if (object == null) return null;
	const id = typeof object.id === 'string' && object.id.startsWith(config.url) ? `${object.id}/undo` : undefined;

	return {
		type: 'Undo',
		...(id ? { id } : {}),
		actor: `${config.url}/users/${user._id}`,
		object,
		published: new Date().toISOString(),
	};
};
