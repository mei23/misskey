import { S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { DriveConfig } from '../../config/types';
import { getAgentByUrl } from '../../misc/fetch';

export function getS3Client(drive: DriveConfig) {
	if (drive.config == null) throw 'drive.config is null';

	const config = {
		endpoint: drive.config.endPoint ? `${drive.config.useSSL ? 'https://' : 'http://'}${drive.config.endPoint}` : undefined,
		credentials: {
			accessKeyId: drive.config.accessKey,
			secretAccessKey: drive.config.secretKey,
		},
		region: drive.config.region || undefined,
		tls: drive.config.useSSL,
		forcePathStyle: !drive.config.endPoint	// AWS with endPoint omitted
			? false
			: drive.config.s3ForcePathStyle == null ? true : !!drive.config.s3ForcePathStyle,
		requestHandler: new NodeHttpHandler({
			httpAgent: getAgentByUrl(new URL('http://example.net'), drive.config.useProxy === undefined ? false : !drive.config.useProxy) as any,
			httpsAgent: getAgentByUrl(new URL('https://example.net'), drive.config.useProxy === undefined ? false : !drive.config.useProxy) as any,
			connectionTimeout: 10 * 1000,
			socketTimeout: 30 * 1000,
		}),
	};

	return new S3Client(config);
}
