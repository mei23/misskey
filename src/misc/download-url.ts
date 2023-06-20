import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import got, * as Got from 'got';
import { httpAgent, httpsAgent, StatusError } from './fetch';
import config from '../config';
import Logger from '../services/logger';
import { checkPrivateIp } from './check-private-ip';
import { checkAllowedUrl } from './check-allowed-url';

const pipeline = util.promisify(stream.pipeline);

export async function downloadUrl(url: string, path: string) {
	if (!checkAllowedUrl(url)) {
		throw new StatusError('Invalid URL', 400);
	}

	const logger = new Logger('download-url');

	logger.info(`Downloading ${url} ...`);

	const timeout = 30 * 1000;
	const operationTimeout = 60 * 1000;
	const maxSize = config.maxFileSize || 262144000;

	const req = got.stream(url, {
		headers: {
			'User-Agent': config.userAgent
		},
		timeout: {
			lookup: timeout,
			connect: timeout,
			secureConnect: timeout,
			socket: timeout,	// read timeout
			response: timeout,
			send: timeout,
			request: operationTimeout,	// whole operation timeout
		},
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		http2: false,	// default
		retry: 0,
	}).on('redirect', (res: Got.Response, opts: Got.NormalizedOptions) => {
		if (!checkAllowedUrl(opts.url)) {
			logger.warn(`Invalid URL: ${opts.url}`);
			req.destroy();
		}
	}).on('response', (res: Got.Response) => {
		if (checkPrivateIp(res.ip)) {
			logger.warn(`Blocked address: ${res.ip}`);
			req.destroy();
		}

		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				logger.warn(`maxSize exceeded (${size} > ${maxSize}) on response`);
				req.destroy();
			}
		}
	}).on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize && progress.percent !== 1) {
			logger.warn(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`);
			req.destroy();
		}
	});

	try {
		await pipeline(req, fs.createWriteStream(path));
	} catch (e) {
		if (e instanceof Got.HTTPError) {
			throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
		} else {
			throw e;
		}
	}

	logger.succ(`Download finished: ${url}`);
}
