import * as S3 from 'aws-sdk/clients/s3';
import { DriveConfig } from '../../config/types';
import { getAgentByUrl } from '../../misc/agent';

export function getS3(drive: DriveConfig) {
	if (drive.config == null) throw 'drive.config is null';
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
			agent: getAgentByUrl(new URL(drive.config.useSSL ? 'https://example.com' : 'http://example.com'), false, true)
		}
	});
}
