import * as fs from 'fs';
import * as crypto from 'crypto';
import * as stream from 'stream';
import * as util from 'util';
import * as FileType from 'file-type';
import isSvg from 'is-svg';
import * as probeImageSize from 'probe-image-size';
import * as FFmpeg from 'fluent-ffmpeg';

// file-typeの出力のフィルタ用
const FILE_TYPE_DETECTS = [
	// Images
	'image/png',
	'image/gif',
	'image/jpeg',
	'image/webp',
	'image/apng',
	'image/bmp',
	'image/tiff',
	'image/x-icon',
	'image/svg+xml',

	// OggS
	'audio/opus',
	'video/ogg',
	'audio/ogg',
	'application/ogg',

	// ISO/IEC base media file format
	'video/quicktime',
	'video/mp4',
	'audio/mp4',
	'video/x-m4v',
	'audio/x-m4a',
	'video/3gpp',
	'video/3gpp2',

	'video/mpeg',
	'audio/mpeg',

	'video/webm',
	'audio/webm',

	'audio/aac',
	'audio/x-flac',
	'audio/vnd.wave',
];
/*
https://github.com/sindresorhus/file-type/blob/main/supported.js
https://github.com/sindresorhus/file-type/blob/main/core.js
https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers
*/

export const FILE_TYPE_BROWSERSAFE = [
	// Images
	'image/png',
	'image/gif',
	'image/jpeg',
	'image/webp',
	'image/apng',
	'image/bmp',
	'image/tiff',
	'image/x-icon',
	// no SVG

	// OggS
	'audio/opus',
	'video/ogg',
	'audio/ogg',
	'application/ogg',

	// ISO/IEC base media file format
	'video/quicktime',
	'video/mp4',
	'audio/mp4',
	'video/x-m4v',
	'audio/x-m4a',
	'video/3gpp',
	'video/3gpp2',

	'video/mpeg',
	'audio/mpeg',

	'video/webm',
	'audio/webm',

	'audio/aac',
	'audio/x-flac',
	'audio/vnd.wave',
];

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

const TYPE_MP4_AS_AUDIO = {
	mime: 'audio/mp4',
	ext: 'mp4'
};

/**
 * Get file information
 */
export async function getFileInfo(path: string): Promise<FileInfo> {
	const size = await getFileSize(path);
	const md5 = await calcHash(path);
	const r = await detectTypeWithCheck(path);

	return {
		size,
		md5,
		type: { mime: r.mime, ext: r.ext },
		width: r.width,
		height: r.height,
		warnings: [],
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

export async function detectTypeWithCheck(path: string) {
	let type = await detectType(path);

	// check type
	if (!FILE_TYPE_DETECTS.includes(type.mime)) {
		type = TYPE_OCTET_STREAM;
	}

	// image dimensions
	let width: number | undefined;
	let height: number | undefined;

	if (type.mime.startsWith('image/')) {
		const imageSize = await detectImageSize(path).catch(e => {
			return undefined;
		});

		// うまく判定できない画像は octet-stream にする
		if (!imageSize) {
			type = TYPE_OCTET_STREAM;
		} else if (imageSize.wUnits === 'px') {
			width = imageSize.width;
			height = imageSize.height;

			// 制限を超えている画像は octet-stream にする
			if (imageSize.width > 16383 || imageSize.height > 16383) {
				type = TYPE_OCTET_STREAM;
			}
		}
	}

	// quicktime/m4v/m4a だけど h264 と aac で構成されているのは、実際はSafari以外でも再生できちゃうのでmp4扱いにしてしまう
	if (type.mime === 'video/quicktime' || type.mime === 'video/x-m4v' || type.mime === 'audio/x-m4a') {
		const props = await getVideoProps(path);
		if (props.streams.filter(s => s.codec_type === 'video').length === 0 || props.streams.filter(s => s.codec_type === 'video').every(s => s.codec_name === 'h264')
			&& (props.streams.filter(s => s.codec_type === 'audio').length === 0 || props.streams.filter(s => s.codec_type === 'audio').every(s => s.codec_name === 'aac'))
		) {
			type = TYPE_MP4;
		}
	}

	// videoを持たないmp4 videoはaudio扱いにしてしまう
	if (type.mime === 'video/mp4') {
		const props = await getVideoProps(path);
		if (props.streams.filter(s => s.codec_type === 'video').length === 0
			&& props.streams.filter(s => s.codec_type === 'audio').length > 0
		) {
			type = TYPE_MP4_AS_AUDIO;
		}
	}

	return {
		mime: type.mime,
		ext: type.ext,
		width,
		height,
	};
}

/**
 * Check the file is SVG or not
 */
export async function checkSvg(path: string) {
	try {
		const size = await getFileSize(path);
		if (size > 1 * 1024 * 1024) return false;
		return isSvg(await fs.promises.readFile(path));
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
