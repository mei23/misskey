import * as assert from 'assert';
import { checkAllowedUrl } from '../src/misc/check-allowed-url';


describe('checkAllowedUrl', () => {
	before(() => {
		process.env.NODE_ENV = 'production';
	});

	after(() => {
		process.env.NODE_ENV = 'test';
	});

	it('Allow https', () => {
		assert.strictEqual(checkAllowedUrl('https://example.com/'), true);
	});

	it('Allow http', () => {
		assert.strictEqual(checkAllowedUrl('https://example.com/'), true);
	});

	it('Deny unix', () => {
		assert.strictEqual(checkAllowedUrl('unix:/var/run/docker.sock:/containers/json'), false);
	});

	it('Deny unix host', () => {
		assert.strictEqual(checkAllowedUrl('http://unix:/var/run/docker.sock:/containers/json'), false);
	});

	it('Deny http non 80', () => {
		assert.strictEqual(checkAllowedUrl('http://example.com:3000/'), false);
	});

	it('Deny https non 443', () => {
		assert.strictEqual(checkAllowedUrl('https://example.com:3000/'), false);
	});

	it('Allow https:443', () => {
		assert.strictEqual(checkAllowedUrl('https://example.com:443/'), true);
	});

	it('Deny non dot host', () => {
		assert.strictEqual(checkAllowedUrl('http://foo/'), false);
	});

	it('Deny private IP address', () => {
		assert.strictEqual(checkAllowedUrl('http://127.0.0.1/'), false);
		assert.strictEqual(checkAllowedUrl('http://192.168.0.254/'), false);
		assert.strictEqual(checkAllowedUrl('http://169.254.169.254/'), false);
		assert.strictEqual(checkAllowedUrl('http://::1/'), false);
		assert.strictEqual(checkAllowedUrl('http://10.0xFF.0377/'), false);
	});

	it('Allow global IP address', () => {
		assert.strictEqual(checkAllowedUrl('http://192.0.2.1/'), false);
	});

	it('Deny with auth user', () => {
		assert.strictEqual(checkAllowedUrl('http://user@example.com/'), false);
		assert.strictEqual(checkAllowedUrl('http://user:@example.com/'), false);
	});

	it('Deny with auth user:pass', () => {
		assert.strictEqual(checkAllowedUrl('http://user:pass@example.com/'), false);
	});

	it('Deny with auth pass', () => {
		assert.strictEqual(checkAllowedUrl('http://:pass@example.com/'), false);
	});
});
