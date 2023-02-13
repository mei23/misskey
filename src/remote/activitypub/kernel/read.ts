import { IRemoteUser } from '../../../models/user';
import { IRead } from '../type';

export const performReadActivity = async (actor: IRemoteUser, activity: IRead): Promise<string> => {
	return `skip`;
};
