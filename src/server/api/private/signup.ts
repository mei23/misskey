import * as Router from '@koa/router';
import * as bcrypt from 'bcryptjs';
import User, { IUser, validateUsername, validatePassword, pack } from '../../../models/user';
import generateUserToken from '../common/generate-native-user-token';
import config from '../../../config';
import Meta from '../../../models/meta';
import RegistrationTicket, { IRegistrationTicket } from '../../../models/registration-tickets';
import usersChart from '../../../services/chart/users';
import fetchMeta from '../../../misc/fetch-meta';
import { verifyRecaptcha } from '../../../misc/captcha';
import { genRsaKeyPair } from '../../../misc/gen-key-pair';

export default async (ctx: Router.RouterContext) => {
	const body = ctx.request.body;

	const instance = await fetchMeta();

	// Verify recaptcha
	// ただしテスト時はこの機構は障害となるため無効にする
	if (process.env.NODE_ENV !== 'test' && instance.enableRecaptcha && instance.recaptchaSecretKey) {
		await verifyRecaptcha(instance.recaptchaSecretKey, body['g-recaptcha-response']).catch(e => {
			ctx.throw(400, e);
		});
	}

	const username = body['username'];
	const password = body['password'];
	const invitationCode = body['invitationCode'];

	//#region Validate invitation code
	let ticket: IRegistrationTicket | undefined;
	let lastTicket = false;

	if (instance?.disableRegistration) {
		if (invitationCode == null || typeof invitationCode !== 'string') {
			ctx.status = 400;
			ctx.body = 'invalid code format';
			return;
		}

		ticket = await RegistrationTicket.findOne({
			code: invitationCode
		});

		if (ticket == null) {
			// invalid code
			ctx.status = 401;
			ctx.body = 'invalid code';
			return;
		}

		// Check expire
		if (ticket.expiresAt) {
			if (ticket.expiresAt < new Date()) {
				ctx.status = 403;
				ctx.body = 'expired';
				return;
			}
		}

		// Check count
		const restCount = ticket.restCount ?? 1;
		if (restCount < 1) {
			ctx.body = 'limit exceeded';
			ctx.status = 403;
			return;
		}

		if (restCount === 1) lastTicket = true;
	}
	//#endregion

	// Validate username
	if (!validateUsername(username)) {
		ctx.status = 400;
		return;
	}

	// Validate password
	if (!validatePassword(password)) {
		ctx.status = 400;
		return;
	}

	const usersCount = await User.count({});

	// Fetch exist user that same username
	const usernameExist = await User
		.count({
			usernameLower: username.toLowerCase(),
			host: null
		}, {
			limit: 1
		});

	// Check username already used
	if (usernameExist !== 0) {
		ctx.status = 400;
		return;
	}

	// Generate hash of password
	const salt = await bcrypt.genSalt(8);
	const hash = await bcrypt.hash(password, salt);

	// Generate secret
	const secret = generateUserToken();

	const keyPair = await genRsaKeyPair();

	// Create account
	const account: IUser = await User.insert({
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
		token: secret,
		password: hash,
		isAdmin: config.autoAdmin && usersCount === 0,
		carefulMassive: true,
		refuseFollow: false,
		autoAcceptFollowed: true,
		profile: {
			bio: null,
			birthday: null,
			location: null
		},
		settings: {
			autoWatch: false
		}
	});

	if (ticket) {
		if (lastTicket) {
			RegistrationTicket.remove({ _id: ticket._id });
		} else {
			RegistrationTicket.update({ _id: ticket._id }, {
				$push: {
					inviteeIds: account._id
				},
				$inc: {
					restCount: -1
				},
			});
		}
	}

	//#region Increment users count
	Meta.update({}, {
		$inc: {
			'stats.usersCount': 1,
			'stats.originalUsersCount': 1
		}
	}, { upsert: true });
	//#endregion

	usersChart.update(account, true);

	const res = await pack(account, account, {
		detail: true,
		includeSecrets: true
	});

	res.token = secret;

	ctx.body = res;
};
