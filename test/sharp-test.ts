import * as assert from 'assert';
import { async } from './utils';
import * as sharp from 'sharp';

describe('sharp', () => {
	it('metadata', async (async () => {
		const path = `${__dirname}/resources/Lenna.jpg`;
		const img = sharp(path);
		const metadata = await img.metadata();
		assert.deepStrictEqual(metadata.format, 'jpeg');
	}));
});
