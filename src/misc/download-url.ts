import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';
import * as http from 'http';
import * as https from 'https';
import got from 'got';
import * as Got from 'got';
import { getAgentByUrl } from './fetch';

import config from '../config';
import * as chalk from 'chalk';
import Logger from '../services/logger';

const pipeline = util.promisify(stream.pipeline);

export async function downloadUrl(url: string, path: string) {
	const logger = new Logger('download-url');

	logger.info(`Downloading ${chalk.cyan(url)} ...`);

	const timeout = 10 * 1000;
	const operationTimeout = 10 * 60 * 1000;
	const maxSize = 1 * 1024 * 1024 * 1024;

	let responseUrl = url;

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
		hooks: {
			beforeRequest: [
				options => {
					options.request = (url: URL, opt: http.RequestOptions, callback?: (response: any) => void) => {
						const requestFunc = url.protocol === 'http:' ? http.request : https.request;
						opt.agent = getAgentByUrl(url, false);
						const clientRequest = requestFunc(url, opt, callback) as http.ClientRequest;
						return clientRequest;
					};
				},
			],
		},
		retry: 0,
	}).on('response', (res: Got.Response) => {
		responseUrl = res.url;

		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				logger.warn(`maxSize exceeded (${size} > ${maxSize}) on response`);
				req.destroy();
			}
		}
	}).on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize) {
			logger.warn(`maxSize exceeded (${progress.transferred} > ${maxSize}) on downloadProgress`);
			req.destroy();
		}
	}).on('error', e => {
		if (e.name === 'HTTPError') {
			const statusCode = (e as Got.HTTPError).response.statusCode;
			const statusMessage = (e as Got.HTTPError).response.statusMessage;
			throw {
				name: `StatusError`,
				statusCode,
				message: `${statusCode} ${statusMessage}`,
			};
		} else {
			throw e;
		}
	});

	await pipeline(req, fs.createWriteStream(path));

	logger.succ(`Download finished: ${chalk.cyan(url)}`);

	return {
		url: responseUrl
	};
}
