import { URLSearchParams } from 'url';
import { getResponse } from './fetch';
import config from '../config';

export async function verifyRecaptcha(secret: string, response: string) {
	const result = await getCaptchaResponse('https://www.recaptcha.net/recaptcha/api/siteverify', secret, response).catch(e => {
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
	const params = new URLSearchParams({
		secret,
		response
	});

	const res = await getResponse({
		url,
		method: 'POST',
		body: params.toString(),
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'User-Agent': config.userAgent
		},
		timeout: 10 * 1000,
	}).catch(e => {
		throw `${e.message || e}`;
	});

	return await JSON.parse(res.body) as CaptchaResponse;
}
