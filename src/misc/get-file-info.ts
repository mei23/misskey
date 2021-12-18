import * as fs from 'fs';
import * as crypto from 'crypto';
import * as stream from 'stream';
import * as util from 'util';
import * as FileType from 'file-type';
import isSvg from 'is-svg';
import * as probeImageSize from 'probe-image-size';
import * as FFmpeg from 'fluent-ffmpeg';

const pipeline = util.promisify(stream.pipeline);

export type FileInfo = {
	size: number;
	md5: string;
	type: {
		mime: string;
		ext: string | null;
	};
	width?: number;
	height?: number;
	//videoProps?: FFmpeg.FfprobeData | null;
	warnings: string[];
};

const TYPE_OCTET_STREAM = {
	mime: 'application/octet-stream',
	ext: null
};

const TYPE_SVG = {
	mime: 'image/svg+xml',
	ext: 'svg'
};

const TYPE_MP4 = {
	mime: 'video/mp4',
	ext: 'mp4'
};

/**
 * Get file information
 */
export async function getFileInfo(path: string): Promise<FileInfo> {
	const warnings = [] as string[];

	const size = await getFileSize(path);
	const md5 = await calcHash(path);

	let type = await detectType(path);

	// image dimensions
	let width: number | undefined;
	let height: number | undefined;

	if (['image/jpeg', 'image/gif', 'image/png', 'image/apng', 'image/webp', 'image/bmp', 'image/tiff', 'image/svg+xml', 'image/vnd.adobe.photoshop'].includes(type.mime)) {
		const imageSize = await detectImageSize(path).catch(e => {
			warnings.push(`detectImageSize failed: ${e}`);
			return undefined;
		});

		// うまく判定できない画像は octet-stream にする
		if (!imageSize) {
			warnings.push(`cannot detect image dimensions`);
			type = TYPE_OCTET_STREAM;
		} else if (imageSize.wUnits === 'px') {
			width = imageSize.width;
			height = imageSize.height;

			// 制限を超えている画像は octet-stream にする
			if (imageSize.width > 16383 || imageSize.height > 16383) {
				warnings.push(`image dimensions exceeds limits`);
				type = TYPE_OCTET_STREAM;
			}
		} else {
			warnings.push(`unsupported unit type: ${imageSize.wUnits}`);
		}
	}

	/*
	let videoProps: FFmpeg.FfprobeData | null | undefined;
	if (type.mime.startsWith('video/')) {
		videoProps = await getVideoProps(path).catch(() => null);
	}
	*/

	return {
		size,
		md5,
		type,
		width,
		height,
		//videoProps,
		warnings: warnings,
	};
}

/**
 * Detect MIME Type and extension
 */
export async function detectType(path: string) {
	// Check 0 byte
	const fileSize = await getFileSize(path);
	if (fileSize === 0) {
		return TYPE_OCTET_STREAM;
	}

	const type = await FileType.fromFile(path);

	if (type) {
		// XMLはSVGかもしれない
		if (type.mime === 'application/xml' && await checkSvg(path)) {
			return TYPE_SVG;
		}

		if (type.mime === 'video/quicktime') {
			const props = await getVideoProps(path);
			if (props.streams.filter(s => s.codec_type === 'video').every(s => s.codec_name === 'h264')
				&& (props.streams.filter(s => s.codec_type === 'audio').length === 0 || props.streams.filter(s => s.codec_type === 'audio').every(s => s.codec_name === 'aac'))) {
				return TYPE_MP4;
			}
		}

		return {
			mime: type.mime,
			ext: type.ext
		};
	}

	// 種類が不明でもSVGかもしれない
	if (await checkSvg(path)) {
		return TYPE_SVG;
	}

	// それでも種類が不明なら application/octet-stream にする
	return TYPE_OCTET_STREAM;
}

/**
 * Check the file is SVG or not
 */
export async function checkSvg(path: string) {
	try {
		const size = await getFileSize(path);
		if (size > 1 * 1024 * 1024) return false;
		return isSvg(fs.readFileSync(path));
	} catch {
		return false;
	}
}

/**
 * Get file size
 */
export async function getFileSize(path: string): Promise<number> {
	const getStat = util.promisify(fs.stat);
	return (await getStat(path)).size;
}

/**
 * Calculate MD5 hash
 */
export async function calcHash(path: string): Promise<string> {
	const hash = crypto.createHash('md5').setEncoding('hex');
	await pipeline(fs.createReadStream(path), hash);
	return hash.read();
}

/**
 * Detect dimensions of image
 */
async function detectImageSize(path: string): Promise<{
	width: number;
	height: number;
	wUnits: string;
	hUnits: string;
}> {
	const readable = fs.createReadStream(path);
	const imageSize = await probeImageSize(readable);
	readable.destroy();
	return imageSize;
}

export async function getVideoProps(path: string): Promise<FFmpeg.FfprobeData> {
	return new Promise((res, rej) => {
		FFmpeg({
			source: path
		})
		.ffprobe((err, data) => {
			if (err) return rej(err);
			res(data);
		});
	});
}
