import got, * as Got from 'got';
import { StatusError, httpAgent, httpsAgent } from '../../fetch';
import { detectEncoding, toUtf8 } from './encoding';
import * as cheerio from 'cheerio';
import { checkPrivateIp } from '../../check-private-ip';

const RESPONSE_TIMEOUT = 20 * 1000;
const OPERATION_TIMEOUT = 60 * 1000;
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
const BOT_UA = `Twitterbot/1.0`;

export async function scpaping(url: string, opts?: { lang?: string; }) {
	const headers = {
		'accept': 'text/html',
		'user-agent': BOT_UA,
	} as Record<string, string>;

	if (opts?.lang) headers['accept-language'] = opts.lang;

	const response = await getResponse({
		url,
		method: 'GET',
		headers,
		typeFilter: /^text\/html/,
	});

	if (checkPrivateIp(response.ip)) {
		throw new StatusError(`Private IP rejected ${response.ip}`, 400, 'Private IP Rejected');
	}

	const encoding = detectEncoding(response.rawBody);
	const body = toUtf8(response.rawBody, encoding);
	const $ = cheerio.load(body);

	return {
		body,
		$,
		response,
	};
}

async function getResponse(args: { url: string, method: 'GET' | 'POST', body?: string, headers: Record<string, string>, typeFilter?: RegExp }) {
	const timeout = RESPONSE_TIMEOUT;
	const operationTimeout = OPERATION_TIMEOUT;

	const req = got<string>(args.url, {
		method: args.method,
		headers: args.headers,
		body: args.body,
		timeout: {
			lookup: timeout,
			connect: timeout,
			secureConnect: timeout,
			socket: timeout,	// read timeout
			response: timeout,
			send: timeout,
			request: operationTimeout,	// whole operation timeout
		},
		agent: { http: httpAgent, https: httpsAgent },
		http2: false,
		retry: 0,
	});

	return await receiveResponce({ req, typeFilter: args.typeFilter });
}

async function receiveResponce<T>(args: { req: Got.CancelableRequest<Got.Response<T>>, typeFilter?: RegExp }) {
	const req = args.req;
	const maxSize = MAX_RESPONSE_SIZE;

	req.on('response', (res: Got.Response) => {
		// Check html
		if (args.typeFilter && !res.headers['content-type']?.match(args.typeFilter)) {
			req.cancel(`Rejected by type filter ${res.headers['content-type']}`);
			return;
		}

		// 応答ヘッダでサイズチェック
		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				req.cancel(`maxSize exceeded (${size} > ${maxSize}) on response`);
			}
		}
	});

	// 受信中のデータでサイズチェック
	req.on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize && progress.percent !== 1) {
			req.cancel(`maxSize exceeded (${progress.transferred} > ${maxSize}) on response`);
		}
	});

	// 応答取得 with ステータスコードエラーの整形
	const res = await req.catch(e => {
		if (e instanceof Got.HTTPError) {
			throw new StatusError(`${e.response.statusCode} ${e.response.statusMessage}`, e.response.statusCode, e.response.statusMessage);
		} else {
			throw e;
		}
	});

	return res;
}
