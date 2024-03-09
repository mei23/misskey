import config from '../../../config';
import { isSelfOrigin } from '../../../misc/convert-host';
import { ILocalUser, IUser } from '../../../models/user';

export default (object: any, user: ILocalUser | IUser) => {
	if (object == null) return null;
	const id = typeof object.id === 'string' && isSelfOrigin(object.id) ? `${object.id}/undo` : undefined;

	return {
		type: 'Undo',
		...(id ? { id } : {}),
		actor: `${config.url}/users/${user._id}`,
		object,
		published: new Date().toISOString(),
	};
};
