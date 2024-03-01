import * as bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import User from '../models/user';
import generateNativeUserToken from '../server/api/common/generate-native-user-token';
import { genEd25519KeyPair, genRsaKeyPair } from '@misskey-dev/node-http-message-signatures';

export async function createSystemUser(username: string) {
	const password = uuid();

	// Generate hash of password
	const salt = await bcrypt.genSalt(8);
	const hash = await bcrypt.hash(password, salt);

	// Generate secret
	const secret = generateNativeUserToken();

	const keyPair = await genRsaKeyPair();
	const ed25519KeyPair = await genEd25519KeyPair();

	// Create user
	const user = await User.insert({
		avatarId: null,
		bannerId: null,
		createdAt: new Date(),
		description: null,
		followersCount: 0,
		followingCount: 0,
		name: null,
		notesCount: 0,
		username: username,
		usernameLower: username.toLowerCase(),
		host: null,
		keypair: keyPair.privateKey,
		ed25519Key: ed25519KeyPair.privateKey,
		token: secret,
		password: hash,
		isAdmin: false,
		isBot: true,
		isLocked: true,
		refuseFollow: true,
		autoAcceptFollowed: false,
		carefulMassive: false,
		profile: {
			bio: null,
			birthday: null,
			location: null
		},
		settings: {
			autoWatch: false
		}
	});

	return user;
}
