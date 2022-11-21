import * as tmp from 'tmp';
import { IImage, convertToJpeg } from './image-processor';
import * as FFmpeg from 'fluent-ffmpeg';

export async function generateVideoThumbnail(path: string): Promise<IImage> {
	const [outDir, cleanup] = await new Promise<[string, any]>((res, rej) => {
		tmp.dir({ unsafeCleanup: true }, (e, path, cleanup) => {
			if (e) return rej(e);
			res([path, cleanup]);
		});
	});

	try {
		await new Promise((res, rej) => {
			FFmpeg({
				source: path,
				timeout: 30,
			})
			.on('end', res)
			.on('error', rej)
			.screenshot({
				folder: outDir,
				filename: 'output.png',
				count: 1,
				timestamps: ['5%']
			});
		});

		const outPath = `${outDir}/output.png`;

		const thumbnail = await convertToJpeg(outPath, 530, 255);

		return thumbnail;
	} finally {
		cleanup();
	}
}
