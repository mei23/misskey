import config from '../../../config';
import { uuid7 as uuid } from '../../../misc/id/uuid7';
import { IActivity } from '../type';
import { LdSignature } from '../misc/ld-signature';
import { ILocalUser } from '../../../models/user';
import { FIXED_CONTEXT } from '../misc/contexts';

export const renderActivity = (x: any): IActivity | null => {
	if (x == null) return null;

	if (x !== null && typeof x === 'object' && x.id == null) {
		x.id = `${config.url}/${uuid()}`;
	}

	return Object.assign({
		'@context': FIXED_CONTEXT
	}, x);
};

export const attachLdSignature = async (activity: any, user: ILocalUser): Promise<IActivity | null> => {
	if (activity == null) return null;

	const ldSignature = new LdSignature();
	ldSignature.debug = false;
	activity = await ldSignature.signRsaSignature2017(activity, user.keypair, `${config.url}/users/${user._id}#main-key`);

	return activity;
};
