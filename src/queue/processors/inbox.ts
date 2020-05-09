import * as Bull from 'bull';
import * as httpSignature from 'http-signature';
import { IRemoteUser } from '../../models/user';
import perform from '../../remote/activitypub/perform';
import { resolvePerson } from '../../remote/activitypub/models/person';
import { toUnicode } from 'punycode';
import { URL } from 'url';
import { publishApLogStream } from '../../services/stream';
import Logger from '../../services/logger';
import { registerOrFetchInstanceDoc } from '../../services/register-or-fetch-instance-doc';
import Instance from '../../models/instance';
import instanceChart from '../../services/chart/instance';
import { getApId } from '../../remote/activitypub/type';
import { UpdateInstanceinfo } from '../../services/update-instanceinfo';
import { isBlockedHost } from '../../misc/instance-info';
import { InboxJobData } from '..';
import DbResolver from '../../remote/activitypub/db-resolver';
import { inspect } from 'util';
import { extractApHost } from '../../misc/convert-host';
import { LdSignature } from '../../remote/activitypub/misc/ld-signature';

const logger = new Logger('inbox');

// ユーザーのinboxにアクティビティが届いた時の処理
export default async (job: Bull.Job<InboxJobData>): Promise<string> => {
	const signature = job.data.signature;
	const activity = job.data.activity;

	const dbResolver = new DbResolver();

	//#region Log
	const info = Object.assign({}, activity);
	delete info['@context'];
	logger.debug(inspect(info));
	//#endregion

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
			user = await resolvePerson(getApId(activity.actor)) as IRemoteUser;
		} catch (e) {
			// 対象が4xxならスキップ
			if (e.statusCode >= 400 && e.statusCode < 500) {
				return `skip: Ignored actor ${activity.actor} - ${e.statusCode}`;
			}
			throw `Error in actor ${activity.actor} - ${e.statusCode || e}`;
		}
	}

	// http-signature signer がわからなければ終了
	if (user == null) {
		throw new Error('failed to resolve http-signature signer');
	}
	//#endregion

	// http-signature signerのpublicKeyを元にhttp-signatureを検証
	const httpSignatureValidated = httpSignature.verifySignature(signature, user.publicKey.publicKeyPem);

	// また、http-signatureのsignerは、activity.actorと一致する必要がある
	if (!httpSignatureValidated || user.uri !== activity.actor) {
		// でもLD-Signatureがありそうならそっちも見る
		if (activity.signature) {
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
		} else {
			throw `skip: http-signature verification failed.`;
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

	//#region Log/stats
	publishApLogStream({
		direction: 'in',
		activity: activity.type,
		host: user.host,
		actor: user.username
	});

	// Update stats
	registerOrFetchInstanceDoc(user.host).then(i => {
		const set = {
			latestRequestReceivedAt: new Date(),
			lastCommunicatedAt: new Date(),
			isNotResponding: false
		} as any;

		Instance.update({ _id: i._id }, {
			$set: set
		});

		UpdateInstanceinfo(i);

		instanceChart.requestReceived(i.host);
	});
	//#endregion

	// アクティビティを処理
	return (await perform(user, activity)) || 'ok';
};
