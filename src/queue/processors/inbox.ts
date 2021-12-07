import * as Bull from 'bull';
import * as httpSignature from 'http-signature';
import { IRemoteUser } from '../../models/user';
import perform from '../../remote/activitypub/perform';
import { resolvePerson } from '../../remote/activitypub/models/person';
import { toUnicode } from 'punycode/';
import { URL } from 'url';
import Logger from '../../services/logger';
import { registerOrFetchInstanceDoc } from '../../services/register-or-fetch-instance-doc';
import Instance from '../../models/instance';
import instanceChart from '../../services/chart/instance';
import { getApId, isDelete, isUndo } from '../../remote/activitypub/type';
import { UpdateInstanceinfo } from '../../services/update-instanceinfo';
import { isBlockedHost } from '../../services/instance-moderation';
import { InboxJobData } from '../types';
import Resolver from '../../remote/activitypub/resolver';
import DbResolver from '../../remote/activitypub/db-resolver';
import { inspect } from 'util';
import { extractApHost } from '../../misc/convert-host';
import { LdSignature } from '../../remote/activitypub/misc/ld-signature';
import resolveUser from '../../remote/resolve-user';
import config from '../../config';
import { publishInstanceModUpdated } from '../../services/server-event';
import { StatusError } from '../../misc/fetch';

const logger = new Logger('inbox');

// ユーザーのinboxにアクティビティが届いた時の処理
export default async (job: Bull.Job<InboxJobData>): Promise<string> => {
	return await tryProcessInbox(job.data);
};

type ApContext = {
	resolver?: Resolver
	dbResolver?: DbResolver
};

export const tryProcessInbox = async (data: InboxJobData, ctx?: ApContext): Promise<string> => {
	const signature = data.signature;
	const activity = data.activity;

	const resolver = ctx?.resolver || new Resolver();
	const dbResolver = ctx?.dbResolver || new DbResolver();

	//#region Log
	logger.debug(inspect(signature));
	logger.debug(inspect(activity));
	//#endregion

	/** peer host (リレーから来たらリレー) */
	const host = toUnicode(new URL(signature.keyId).hostname.toLowerCase());

	// ブロックしてたら中断
	if (await isBlockedHost(host)) {
		return `skip: Blocked instance: ${host}`;
	}

	//#region resolve http-signature signer
	let user: IRemoteUser | null;

	// keyIdを元にDBから取得
	user = await dbResolver.getRemoteUserFromKeyId(signature.keyId);

	// || activity.actorを元にDBから取得 || activity.actorを元にリモートから取得
	if (user == null) {
		try {
			user = await resolvePerson(getApId(activity.actor), undefined, resolver, isDelete(activity) || isUndo(activity)) as IRemoteUser;
		} catch (e) {
			// 対象が4xxならスキップ
			if (e instanceof StatusError && e.isClientError) {
				return `skip: Ignored actor ${activity.actor} - ${e.statusCode}`;
			}
			throw `Error in actor ${activity.actor} - ${e.statusCode || e}`;
		}
	}

	// http-signature signer がわからなければ終了
	if (user == null) {
		return `skip: failed to resolve http-signature signer`;
	}

	// publicKey がなくても終了
	if (user.publicKey == null) {
		return `skip: failed to resolve user publicKey`;
	}
	//#endregion

	// http-signature signerのpublicKeyを元にhttp-signatureを検証
	const httpSignatureValidated = httpSignature.verifySignature(signature, user.publicKey.publicKeyPem);

	// 署名検証失敗時にはkeyが変わったことも想定して、WebFingerからのユーザー情報の更新をトリガしておく (24時間以上古い場合に発動)
	if (!httpSignatureValidated) {
		resolveUser(user.username, user.host);
	}

	// また、http-signatureのsignerは、activity.actorと一致する必要がある
	if (!httpSignatureValidated || user.uri !== activity.actor) {
		// でもLD-Signatureがありそうならそっちも見る
		if (!config.ignoreApForwarded && activity.signature) {
			if (activity.signature.type !== 'RsaSignature2017') {
				return `skip: unsupported LD-signature type ${activity.signature.type}`;
			}

			// activity.signature.creator: https://example.oom/users/user#main-key
			// みたいになっててUserを引っ張れば公開キーも入ることを期待する
			if (activity.signature.creator) {
				const candicate = activity.signature.creator.replace(/#.*/, '');
				await resolvePerson(candicate).catch(() => null);
			}

			// keyIdからLD-Signatureのユーザーを取得
			user = await dbResolver.getRemoteUserFromKeyId(activity.signature.creator);
			if (user == null) {
				return `skip: LD-Signatureのユーザーが取得できませんでした`;
			}

			if (user.publicKey == null) {
				return `skip: LD-SignatureのユーザーはpublicKeyを持っていませんでした`;
			}

			// LD-Signature検証
			const ldSignature = new LdSignature();
			const verified = await ldSignature.verifyRsaSignature2017(activity, user?.publicKey.publicKeyPem).catch(() => false);
			if (!verified) {
				return `skip: LD-Signatureの検証に失敗しました`;
			}

			// もう一度actorチェック
			if (user.uri !== activity.actor) {
				return `skip: LD-Signature user(${user.uri}) !== activity.actor(${activity.actor})`;
			}

			// ブロックしてたら中断
			const ldHost = extractApHost(user.uri);
			if (await isBlockedHost(ldHost)) {
				return `skip: Blocked instance: ${ldHost}`;
			}
		} else {
			return `skip: http-signature verification failed and ${config.ignoreApForwarded ? 'ignoreApForwarded' : 'no LD-Signature'}. keyId=${signature.keyId}`;
		}
	}

	// activity.idがあればホストが署名者のホストであることを確認する
	if (typeof activity.id === 'string') {
		const signerHost = extractApHost(user.uri);
		const activityIdHost = extractApHost(activity.id);
		if (signerHost !== activityIdHost) {
			return `skip: signerHost(${signerHost}) !== activity.id host(${activityIdHost}`;
		}
	}

	// Update stats
	registerOrFetchInstanceDoc(host).then(i => {
		const set = {
			latestRequestReceivedAt: new Date(),
			lastCommunicatedAt: new Date(),
			isNotResponding: false,
			isMarkedAsClosed: false,
		} as any;

		Instance.update({ _id: i._id }, {
			$set: set
		}).then(() => {
			publishInstanceModUpdated();
		})

		UpdateInstanceinfo(i, data.request);

		instanceChart.requestReceived(i.host);
	});
	//#endregion

	// アクティビティを処理
	return (await perform(user, activity)) || 'ok';
};
