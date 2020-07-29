/**
 * ユーザーが設定する必要のある情報
 */
export type Source = {
	repository_url?: string;
	feedback_url?: string;
	url: string;
	port: number;
	https?: { [x: string]: string };
	disableHsts?: boolean;
	mongodb: {
		host: string;
		port: number;
		db: string;
		user: string;
		pass: string;
	};
	redis: {
		host: string;
		port: number;
		pass: string;
		db?: number;
		prefix?: string;
	};
	elasticsearch: {
		host: string;
		port: number;
		pass: string;
	};
	drive?: DriveConfig;
	remoteDrive?: DriveConfig;
	proxyRemoteFiles?: boolean;

	autoAdmin?: boolean;

	disableFederation?: boolean;
	disableUrlPreview?: boolean;
	disablePosts?: boolean;

	proxy?: string;
	proxySmtp?: string;

	proxyProxy?: string;

	accesslog?: string;

	workerStrategies?: {
		serverWorkerCount?: number;
		queueWorkerCount?: number;
		workerWorkerCount?: number;
	};

	outgoingAddressFamily?: 'ipv4' | 'ipv6' | 'dual';

	deliverJobConcurrency?: number;
	inboxJobConcurrency?: number;
	deliverJobPerSec?: number;
	inboxJobPerSec?: number;
	deliverJobMaxAttempts?: number;
	inboxJobMaxAttempts?: number;

	mecabSearch?: {
		mecabBin: string;
		mecabDic: string;
	};

	icons?: Icons
};

export type DriveConfig = {
	storage: string;
	bucket?: string;
	prefix?: string;
	baseUrl?: string;
	config?: {
		endPoint: string;
		port?: number;
		useSSL?: boolean;
		accessKey: string;
		secretKey: string;
		region?: string;
		transport?: string;
		sessionToken?: string;
		partSize?: number;
	};
};

export type Icons = {
	favicon?: {
		url?: string;
		type?: string;
	};
	appleTouchIcon?: {
		url?: string;
	};
	manifest192?: {
		url?: string;
	};
	manifest512?: {
		url?: string;
	};
};

/**
 * Misskeyが自動的に(ユーザーが設定した情報から推論して)設定する情報
 */
export type Mixin = {
	version: string;
	host: string;
	hostname: string;
	scheme: string;
	wsScheme: string;
	apiUrl: string;
	wsUrl: string;
	authUrl: string;
	driveUrl: string;
	userAgent: string;
};

export type Config = Source & Mixin;
