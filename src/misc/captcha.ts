import got from 'got';
import { beforeRequestHook, receiveResponce } from './fetch';
import config from '../config';

export async function verifyRecaptcha(secret: string, response: string) {
	const result = await getCaptchaResponse('https://www.google.com/recaptcha/api/siteverify', secret, response).catch(e => {
		throw `recaptcha-request-failed: ${e}`;
	});

	if (result.success !== true) {
		const errorCodes = result['error-codes'] ? result['error-codes']?.join(', ') : '';
		throw `recaptcha-failed: ${errorCodes}`;
	}
}

export async function verifyHcaptcha(secret: string, response: string) {
	const result = await getCaptchaResponse('https://hcaptcha.com/siteverify', secret, response).catch(e => {
		throw `hcaptcha-request-failed: ${e}`;
	});

	if (result.success !== true) {
		const errorCodes = result['error-codes'] ? result['error-codes']?.join(', ') : '';
		throw `hcaptcha-failed: ${errorCodes}`;
	}
}

type CaptchaResponse = {
	success: boolean;
	'error-codes'?: string[];
};

async function getCaptchaResponse(url: string, secret: string, response: string): Promise<CaptchaResponse> {
	const req = got.post(url, {
		headers: Object.assign({
			'User-Agent': config.userAgent,
		}),
		form: {
			secret,
			response
		},
		timeout: 10 * 1000,
		responseType: 'json',
		hooks: {
			beforeRequest: [ beforeRequestHook ],
		},
		retry: 0,
	});

	const res = await receiveResponce(req, 10 * 1024 * 1024);

	return res.body as CaptchaResponse;
}
