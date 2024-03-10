import * as Bull from 'bull';
import { verifyDraftSignature } from '@misskey-dev/node-http-message-signatures';
import { IRemoteUser, isRemoteUser } from '../../models/user';
import perform from '../../remote/activitypub/perform';
import { resolvePerson } from '../../remote/activitypub/models/person';
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
import { LdSignature } from '../../remote/activitypub/misc/ld-signature';
import resolveUser from '../../remote/resolve-user';
import config from '../../config';
import { publishInstanceModUpdated } from '../../services/server-event';

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
	//#region Signatureパース＆バージョンチェック
	const signature = data.signature ?
		'version' in data.signature ? data.signature.value : data.signature
		: null;

	// RFC 9401はsignatureが配列になるが、とりあえずエラーにする
	if (Array.isArray(signature)) {
		throw new Error('signature is array');
	}

	// signatureが取得できない謎アクティビティも、とりあえずエラーにする
	if (signature == null) {
		throw new Error('signature is null');
	}

	const activity = data.activity;
	//#endregion

	//#region Log
	logger.debug(inspect(signature));
	logger.debug(inspect(activity));
	//#endregion

	//#region check blocking
	const actorHost = new URL(getApId(activity.actor)).hostname;
	if (await isBlockedHost(actorHost)) {
		return `skip: Blocked instance in actor: ${actorHost}`;
	}

	// 一時的にリレーを抑制したいような用途で使う
	const keyIdHost = new URL(signature.keyId).hostname;
	if (await isBlockedHost(keyIdHost)) {
		return `skip: Blocked instance in keyId: ${keyIdHost}`;
	}
	//#endregion

	const resolver = ctx?.resolver || new Resolver();

	/** DBにないユーザーの削除系でリモート解決しても意味ないので抑制するフラグ */
	const suppressResolve = isDelete(activity) || isUndo(activity);

	/**
	 * Fetch user and validate by HTTP-Signature
	 * @returns user on success or null
	 */
	const authUserByHttpSignature = async (): Promise<IRemoteUser | null> => {
		// 別サーバーで署名しているのは失敗にする
		if (keyIdHost !== actorHost) {
			logger.debug(`HTTP-Signature: keyIdHost=${keyIdHost} !== actorHost=${actorHost}`);
			return null;
		}

		// actorを取得
		const httpUser = await resolvePerson(getApId(activity.actor), undefined, resolver, suppressResolve);

		// actorが取得できなければ失敗
		if (httpUser == null) {
			logger.warn(`HTTP-Signature: failed to resolve http-signature signer`);
			return null;
		}

		// リモートユーザーでなければ失敗
		if (isRemoteUser(httpUser) === false) {
			logger.warn(`HTTP-Signature: actor is not remote`);
			return null;
		}

		// ユーザーのkeyIdに一致するキーを探す、なければ失敗
		const availablePublicKeys = [...(httpUser.publicKey ? [httpUser.publicKey] : []), ...(httpUser.additionalPublicKeys ?? [])];
		const matchedPublicKey = availablePublicKeys.filter(x => x.id === signature.keyId)[0];
		if (matchedPublicKey == null) {
			logger.warn(`HTTP-Signature: failed to find matchedPublicKey. keyId=${signature.keyId}`);
			return null;
		}

		// 署名検証
		const errorLogger = (ms: any) => logger.error(ms);
		const httpSignatureValidated = await verifyDraftSignature(signature, matchedPublicKey.publicKeyPem, errorLogger);

		if (httpSignatureValidated === true) {
			return httpUser;	// 成功
		} else {
			// 署名検証失敗時にはkeyが変わったことも想定して、WebFingerからのユーザー情報の更新を期間を短めにしてトリガしておく。次回リトライする
			// なぜ即時フェッチでリトライしないのか？リバースプロキシでそれなりにキャッシュされるので急いでも意味がないから
			if (httpUser.lastFetchedAt == null || Date.now() - httpUser.lastFetchedAt.getTime() > 1000 * 60 * 5) {
				resolveUser(httpUser.username, httpUser.host, {}, true);
			}
			throw new Error(`HTTP-Signature validation failed. keyId=${signature.keyId}, matchedPublicKey=${matchedPublicKey.id}`);
		}
	};

	// HTTP-Signatureで検証
	let authedUser = await authUserByHttpSignature();

	/**
	 * Fetch user and validate by LD-Signature
	 * @returns user on success or null
	 */
	const authUserByLdSignature = async () => {
		// LD-Signatureあるか?
		if (activity.signature == null) {
			logger.warn(`LD-Signature: no LD-Signature`);
			return null;
		}

		// LD-Signatureバージョンは的確か?
		if (activity.signature.type !== 'RsaSignature2017') {
			logger.warn(`LD-Signature: unsupported LD-signature type ${activity.signature.type}`);
			return null;
		}

		// 別サーバーで署名しているのは失敗にする
		const ldHost = new URL(activity.signature.creator).hostname;
		if (ldHost !== actorHost) {
			logger.debug(`LD-Signature: ldHost=${ldHost} !== actorHost=${actorHost}`);
			return null;
		}

		// ユーザー取得 (ここでsignature.creatorのハッシュ以降を削除して探索するというキモいロジックが入る)
		const ldUser = await resolvePerson(activity.signature.creator.replace(/#.*/, ''), undefined, resolver, suppressResolve).catch(() => null);

		if (ldUser == null) {
			logger.warn(`LD-Signature: signature.creatorが取得できませんでした`);
			return null;
		}

		// リモートユーザーでなければ失敗
		if (isRemoteUser(ldUser) === false) {
			logger.warn(`LD-Signature: signature.creator is not remote`);
			return null;
		}

		// 現状のLD-Signature実装に、RSA以外なんて想定されてません。ぷっぷくぷー
		if (ldUser.publicKey == null) {
			logger.warn(`LD-Signature: signature.creatorはpublicKeyを持っていませんでした`);
			return null;
		}

		// LD-Signature検証
		const ldSignature = new LdSignature();
		const verified = await ldSignature.verifyRsaSignature2017(activity, ldUser.publicKey.publicKeyPem).catch(() => false);
		if (verified === true) {
			return ldUser;
		} else {
			logger.warn(`LD-Signature: 検証に失敗しました`);
			return null;
		}
	};

	// HTTP-Signature検証に失敗した場合、オプションで規制されない限りLD-Signatureも見る
	if (authedUser == null) {
		// LD-Signatureなんか使わないオプション
		if (config.ignoreApForwarded ) {
			return `skip: http-signature verification failed and ${config.ignoreApForwarded ? 'ignoreApForwarded' : 'no LD-Signature'}`;
		}

		authedUser = await authUserByLdSignature();
	}

	if (authedUser == null) {
		return `skip: HTTP-Signature and LD-Signature verification failed'}`;
	}

	// Update stats
	registerOrFetchInstanceDoc(keyIdHost).then(i => {
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
	return (await perform(authedUser, activity)) || 'ok';
};
