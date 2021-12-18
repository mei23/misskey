import config from '../../../config';
import { ILocalUser } from '../../../models/user';

export default (object: any, user: ILocalUser, id?: string) => {
	const activity = {
		type: 'Delete',
		actor: `${config.url}/users/${user._id}`,
		object,
		published: new Date().toISOString(),
	} as any;

	if (id) activity.id = id;

	return activity;
};
