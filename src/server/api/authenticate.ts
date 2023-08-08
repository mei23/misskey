import App, { IApp } from '../../models/app';
import { default as User, IUser } from '../../models/user';
import AccessToken from '../../models/access-token';
import isNativeToken from './common/is-native-token';
import { IEndpoint } from './endpoints';
import limiter from './limiter';

export class AuthenticationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthenticationError';
	}
}

export class AuthenticationLimitError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AuthenticationLimitError';
	}
}

export default async (token: string, ip?: string): Promise<[IUser | null | undefined, IApp | null | undefined]> => {
	if (token == null) {
		return [null, null];
	}

	const ep = {
		name: 'authx300',
		exec: null,
		meta: {
			limit: {
				duration: 300 * 1000,
				max: 300 * 10,
			}
		}
	} as IEndpoint;

	if (token != null && ip != null) {
		await limiter(ep, undefined, ip).catch(e => {
			throw new AuthenticationLimitError('AuthenticationLimitError');
		});
	}

	if (isNativeToken(token)) {
		// Fetch user
		const user: IUser | null | undefined = await User
			.findOne({ token });

		if (user == null) {
			throw new AuthenticationError('user not found');
		}

		return [user, null];
	} else {
		const accessToken = await AccessToken.findOne({
			hash: token.toLowerCase()
		});

		if (accessToken == null) {
			throw new AuthenticationError('invalid signature');
		}

		const app = await App
			.findOne({ _id: accessToken.appId });

		const user = await User
			.findOne({ _id: accessToken.userId });

		return [user, app];
	}
};
