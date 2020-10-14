import * as http from 'http';
import * as https from 'https';
import * as cache from 'lookup-dns-cache';
import got from 'got';
import * as Got from 'got';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import config from '../config';

export const useHttp2 = !!config.useClientHttp2 && !config.proxy;

export async function getJson(url: string, accept = 'application/json, */*', timeout = 10000, headers?: Record<string, string>) {
	const maxSize = 10 * 1024 * 1024;

	const req = got.get<any>(url, {
		headers: Object.assign({
			'User-Agent': config.userAgent,
			Accept: accept
		}, headers || {}),
		responseType: 'json',
		timeout,
		http2: useHttp2,
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		retry: 0,
	});

	const res = await receiveResponce(req, maxSize);
	return res.body;
}

export async function getHtml(url: string, accept = 'text/html, */*', timeout = 10000, headers?: Record<string, string>) {
	const maxSize = 10 * 1024 * 1024;

	const req = got.get<string>(url, {
		headers: Object.assign({
			'User-Agent': config.userAgent,
			Accept: accept
		}, headers || {}),
		timeout,
		http2: useHttp2,
		agent: {
			http: httpAgent,
			https: httpsAgent,
		},
		retry: 0,
	});

	const res = await receiveResponce(req, maxSize);
	return res.body;
}

/**
 * Receive response (with size limit)
 * @param req Request
 * @param maxSize size limit
 */
export async function receiveResponce<T>(req: Got.CancelableRequest<Got.Response<T>>, maxSize: number) {
	// 応答ヘッダでサイズチェック
	req.on('response', (res: Got.Response) => {
		const contentLength = res.headers['content-length'];
		if (contentLength != null) {
			const size = Number(contentLength);
			if (size > maxSize) {
				req.cancel();
			}
		}
	});

	// 受信中のデータでサイズチェック
	req.on('downloadProgress', (progress: Got.Progress) => {
		if (progress.transferred > maxSize) {
			req.cancel();
		}
	});

	// 応答取得 with ステータスコードエラーの整形
	const res = await req.catch(e => {
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

	return res;
}

/**
 * agent を URL から設定する beforeRequest hook
 */
export function beforeRequestHook(options: Got.NormalizedOptions) {
	options.request = (url: URL, opt: http.RequestOptions, callback?: (response: any) => void) => {
		const requestFunc = url.protocol === 'http:' ? http.request : https.request;
		opt.agent = getAgentByUrl(url, false);
		const clientRequest = requestFunc(url, opt, callback) as http.ClientRequest;
		return clientRequest;
	};
}

/**
 * Get http non-proxy agent
 */
const _http = new http.Agent({
	keepAlive: true,
	keepAliveMsecs: 30 * 1000,
});

/**
 * Get https non-proxy agent
 */
const _https = new https.Agent({
	keepAlive: true,
	keepAliveMsecs: 30 * 1000,
	lookup: cache.lookup,
});

/**
 * Get http proxy or non-proxy agent
 */
export const httpAgent = config.proxy
	? new HttpProxyAgent(config.proxy) as unknown as http.Agent
	: _http;

/**
 * Get https proxy or non-proxy agent
 */
export const httpsAgent = config.proxy
	? new HttpsProxyAgent(config.proxy) as unknown as https.Agent
	: _https;

/**
 * Get agent by URL
 * @param url URL
 * @param bypassProxy Allways bypass proxy
 */
export function getAgentByUrl(url: URL, bypassProxy = false): http.Agent | https.Agent {
	if (bypassProxy) {
		return url.protocol == 'http:' ? _http : _https;
	} else {
		return url.protocol == 'http:' ? httpAgent : httpsAgent;
	}
}
