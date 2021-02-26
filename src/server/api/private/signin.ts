import * as Fastify from 'fastify';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import User, { ILocalUser } from '../../../models/user';
import Signin, { pack } from '../../../models/signin';
import { publishMainStream } from '../../../services/stream';
import signin from '../common/signin';
import config from '../../../config';
import limiter from '../limiter';
import { IEndpoint } from '../endpoints';

export default async (request: Fastify.FastifyRequest, reply: Fastify.FastifyReply) => {
	reply.header('Access-Control-Allow-Origin', config.url);
	reply.header('Access-Control-Allow-Credentials', 'true');

	const ep = {
		name: 'signin',
		exec: null,
		meta: {
			limit: {
				duration: 300 * 1000,
				max: 10,
			}
		}
	} as IEndpoint;

	await limiter(ep, undefined, request.ip).catch(e => {
		reply.tooManyRequests();
	});

	const body = request.body as any;	// TODO
	const username = body['username'];
	const password = body['password'];
	const token = body['token'];

	if (typeof username != 'string') {
		reply.badRequest();
		return;
	}

	if (typeof password != 'string') {
		reply.badRequest();
		return;
	}

	if (token != null && typeof token != 'string') {
		reply.badRequest();
		return;
	}

	// Fetch user
	const user = await User.findOne({
		usernameLower: username.toLowerCase(),
		host: null
	}, {
			fields: {
				data: false,
				profile: false
			}
		}) as ILocalUser;

	if (user == null) {
		reply.notFound('user not found');
		return;
	}

	// Compare password
	const same = await bcrypt.compare(password, user.password);

	if (same) {
		if (user.twoFactorEnabled) {
			const verified = (speakeasy as any).totp.verify({
				secret: user.twoFactorSecret,
				encoding: 'base32',
				token: token
			});

			if (verified) {
				signin(request, reply, user);	// TODO
			} else {
				reply.unauthorized('invalid token');
			}
		} else {
			signin(request, reply, user);
		}
	} else {
		reply.unauthorized('incorrect password');
	}

	// Append signin history
	const record = await Signin.insert({
		createdAt: new Date(),
		userId: user._id,
		ip: request.ip,
		headers: request.headers,
		success: same
	});

	// Publish signin event
	publishMainStream(user._id, 'signin', await pack(record));
};
