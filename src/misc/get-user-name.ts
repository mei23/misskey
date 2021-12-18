import { IUser } from '../models/user';
import { ThinPackedUser } from '../models/packed-schemas';

export default function(user: IUser | ThinPackedUser): string {
	return user.name || user.username;
}
