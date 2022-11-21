import $ from 'cafy';
import define from '../define';
import * as ms from 'ms';
import { sendEmail } from '../../../services/send-email';
import User, { isLocalUser } from '../../../models/user';
import PasswordResetRequest from '../../../models/password-reset-request';
import config from '../../../config';
import { secureRndstr } from '../../../misc/secure-rndstr';
import { apiLogger } from '../logger';

export const meta = {
	tags: ['reset password'],

	requireCredential: false as const,

	limit: {
		duration: ms('1hour'),
		max: 3
	},

	params: {
		username: {
			validator: $.str.min(1)
		},

		email: {
			validator: $.str.min(1)
		},
	},

	errors: {
	}
};

export default define(meta, async (ps) => {
	const user = await User.findOne({
		usernameLower: ps.username.toLowerCase(),
		host: null,
	})

	// そのユーザーは存在しない
	if (user == null) {
		apiLogger.warn(`Reset password requested for ${ps.username}, but not found.`);
		return;	// エラー内容を返してもいい
	}

	// ローカルユーザーではない (これがマッチすることはない)
	if (!isLocalUser(user)) throw new Error();

	// 削除済み
	if (user.isDeleted != null) {
		apiLogger.warn(`Reset password requested for ${ps.username}, but deleted.`);
		return;	// エラー内容を返してもいい
	}

	// 凍結されている
	if (user.isSuspended) {
		apiLogger.warn(`Reset password requested for ${ps.username}, but suspended.`);
		return;	// エラー内容を返してもいい
	}

	// 合致するメアドが登録されていなかったら無視
	if (user.email !== ps.email) {
		try {
			apiLogger.warn(`Reset password requested for ${ps.username}, but email missmatch.`);
		} catch {}
		return;	// エラー内容はあえて返さない
	}

	// メアドが認証されていなかったら無視
	if (!user.emailVerified) {
		try {
			apiLogger.warn(`Reset password requested for ${ps.username}, but email not verified.`);
		} catch {}
		return;	// エラー内容はあえて返さない
	}

	const token = secureRndstr(50);

	await PasswordResetRequest.insert({
		createdAt: new Date(),
		userId: user._id,
		token
	});

	const link = `${config.url}/reset-password/${token}`;

	sendEmail(ps.email, 'Password reset requested', `To reset password, please click the URL below.\n${link}`);
});
