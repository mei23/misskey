import * as S3 from 'aws-sdk/clients/s3';
import { DriveConfig } from '../../config/types';
import { getAgentByUrl } from '../../misc/fetch';

export function getS3(drive: DriveConfig) {
	if (drive.config == null) throw 'drive.config is null';

	// dummy for selecting agent
	const u = drive.config.endPoint != null
		? `${drive.config.useSSL ? 'https://' : 'http://'}${drive.config.endPoint}`
		: `${drive.config.useSSL ? 'https://' : 'http://'}example.net`;

	return new S3({
		endpoint: drive.config.endPoint || undefined,
		accessKeyId: drive.config.accessKey,
		secretAccessKey: drive.config.secretKey,
		region: drive.config.region || undefined,
		sslEnabled: drive.config.useSSL,
		s3ForcePathStyle: !drive.config.endPoint	// AWS with endPoint omitted
			? false
			: drive.config.s3ForcePathStyle == null ? true : !!drive.config.s3ForcePathStyle,
		httpOptions: {
			agent: getAgentByUrl(new URL(u), drive.config.useProxy === undefined ? false : !drive.config.useProxy)
		}
	});
}
