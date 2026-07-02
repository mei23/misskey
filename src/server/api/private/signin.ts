import * as Router from '@koa/router';
import * as bcrypt from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import User, { ILocalUser } from '../../../models/user';
import Signin, { pack } from '../../../models/signin';
import { publishMainStream } from '../../../services/stream';
import signin from '../common/signin';
import config from '../../../config';
import limiter from '../limiter';
import { IEndpoint } from '../endpoints';
import redisClient from '../../../db/redis';

export default async (ctx: Router.RouterContext) => {
	ctx.set('Access-Control-Allow-Origin', config.url);
	ctx.set('Access-Control-Allow-Credentials', 'true');

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

	await limiter(ep, undefined, ctx.ip).catch(e => {
		ctx.throw(429);
	});

	const body = ctx.request.body;
	const username = body['username'];
	const password = body['password'];
	const token = body['token'];

	if (typeof username != 'string') {
		ctx.status = 400;
		return;
	}

	if (typeof password != 'string') {
		ctx.status = 400;
		return;
	}

	if (token != null && typeof token != 'string') {
		ctx.status = 400;
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

	if (user == null || user.isDeleted || user.isSuspended) {
		ctx.throw(404, {
			error: 'user not found'
		});
		return;
	}

	// Compare password
	const same = await bcrypt.compare(password, user.password);

	if (same) {
		if (user.twoFactorEnabled) {
			if (!token) {
				ctx.throw(403, { error: 'invalid token' });
				return;
			}

			const normalizedToken = token.trim();
			const stepSeconds = 30;
			const windowSize = 1;

			// 1. 基準となる現在時刻（秒）を完全に固定
			const nowSeconds = Math.floor(Date.now() / 1000);

			// 2. 固定した時刻を明示して検証を実行
			const tokenDelta = speakeasy.totp.verifyDelta({
				secret: user.twoFactorSecret,
				encoding: 'base32',
				token: normalizedToken,
				window: windowSize,
				step: stepSeconds,
				time: nowSeconds
			});

			if (tokenDelta == null || typeof tokenDelta.delta !== 'number') {
				ctx.throw(403, {
					error: 'invalid token'
				});
				return;
			}

			// 3. 固定した同じ時刻からベースとなるステップ数を算出
			const currentStep = Math.floor(nowSeconds / stepSeconds);
			
			// 実際に対象となったタイムステップを特定
			const actualStep = currentStep + tokenDelta.delta;

			// 4. 計算されたステップ番号をキーにして二重使用を防止
			const usedStepRedisKey = `2fa:used:${user._id}:${actualStep}`;

			/**
			 * 【TTL（有効期限）の選定と安全マージンの検証】
			 * 
			 * 1. 理論上の必要最小幅の計算:
			 *    step: 30秒, window: 1 の場合、システムが受け付ける物理的な最大時間幅は
			 *    過去30秒 ＋ 現在30秒 ＋ 未来30秒 ＝ 計 90秒間 です。
			 *    (数式: stepSeconds * (windowSize * 2 + 1) = 90)
			 * 
			 * 2. 安全マージン（バッファ）の追加:
			 *    理論値ジャスト（90秒）に設定した場合、マルチサーバー環境（ロードバランサー配下など）における
			 *    サーバー間の微小な時計のズレ（NTPのドリフト）やネットワーク遅延が原因で、
			 *    「Redis内ではキーが揮発した」が「別のサーバーの検証ロジックではまだ一瞬だけ有効範囲内」
			 *    という極めて僅かな隙（リプレイ攻撃の成立リスク）が生じる可能性があります。
			 * 
			 * 3. 調整時のメリット・デメリット考察:
			 *    ▼ これより短くする場合（例: バッファを削り理論値ジャストに近づける）
			 *       - メリット: Redisのメモリ回転率が最大化され、不要なキーが最速で消去される。
			 *       - デメリット: サーバー間の時刻ズレや高負荷時の遅延により、一瞬の隙を突いたリプレイ攻撃を許すリスクが残る。
			 *    ▼ これより長くする場合（例: バッファを大きく取る）
			 *       - メリット: 時刻同期のズレやネットワーク遅延に対して極めて安全。
			 *       - デメリット: アクティブユーザー数が多い環境において、Redisのメモリ保持量（キー数）が無駄に増加する。
			 * 
			 * 4. 結論:
			 *    将来のパラメータ変更時に安全マージンが自動追従するよう、動的に算出した理論最大幅に対して、
			 *    時刻の揺らぎを確実に吸収するバッファ（120秒）を加算したロジックを採用します。
			 */
			const ttl = (stepSeconds * (windowSize * 2 + 1)) + 120;

			const setResult = await redisClient.set(usedStepRedisKey, '1', 'EX', ttl, 'NX');

			if (setResult === null) {
				ctx.throw(403, {
					error: 'invalid token'
				});
				return;
			}

			signin(ctx, user);
		} else {
			signin(ctx, user);
		}
	} else {
		ctx.throw(403, {
			error: 'incorrect password'
		});
	}

	// Append signin history
	const record = await Signin.insert({
		createdAt: new Date(),
		userId: user._id,
		ip: ctx.ip,
		headers: ctx.headers,
		success: same
	});

	// Publish signin event
	publishMainStream(user._id, 'signin', await pack(record));
};
