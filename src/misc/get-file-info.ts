import * as fs from 'fs';
import * as crypto from 'crypto';
import * as stream from 'stream';
import * as util from 'util';
import * as FileType from 'file-type';
import * as probeImageSize from 'probe-image-size';
import * as FFmpeg from 'fluent-ffmpeg';

// file-typeの出力のフィルタ用
const FILE_TYPE_DETECTS = [
	// Images
	'image/png',
	'image/gif',
	'image/jpeg',
	'image/webp',
	'image/avif',
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
	'image/avif',
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
	type: Type;
	width?: number;
	height?: number;
	warnings: string[];
};

type Type = {
	mime: string;
	ext: string | null;
	width?: number;
	height?: number;
}

const TYPE_OCTET_STREAM = {
	mime: 'application/octet-stream',
	ext: null
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

export async function detectTypeWithCheck(path: string): Promise<Type> {
	// Check 0 byte
	const fileSize = await getFileSize(path);
	if (fileSize === 0) {
		return TYPE_OCTET_STREAM;
	}

	// 画像か判定＆サイズ取得
	const img = await detectImageSize(path);
	if (img) {
		// 画像だが検出対象でなければoctet-stream
		if (!FILE_TYPE_DETECTS.includes(img.mime)) {
			return TYPE_OCTET_STREAM;
		}

		// 画像だがサイズが制限を超えていたらoctet-stream
		if (img.width > 16383 || img.height > 16383) {
			return TYPE_OCTET_STREAM;
		}

		// 画像確定
		return {
			mime: img.mime,
			ext: img.ext,
			width: img.width,
			height: img.height,
		};
	}

	// file-typeで認識
	const ft = await FileType.fromFile(path)

	// 認識できなければoctet-stream
	if (!ft) {
		return TYPE_OCTET_STREAM;
	}

	// 検出対象でなければoctet-stream
	if (!FILE_TYPE_DETECTS.includes(ft.mime)) {
		return TYPE_OCTET_STREAM;
	}

	let type = {
		mime: ft.mime as string,
		ext: ft.ext as string,
	};

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

	return type;
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
async function detectImageSize(path: string) {
	const readable = fs.createReadStream(path);
	const probed = await probeImageSize(readable).catch(() => undefined);
	readable.destroy();

	if (probed) {
		return {
			mime: probed.mime,
			ext: probed.type,
			width: probed.width,
			height: probed.height,
			wUnits: probed.wUnits,
			hUnits: probed.hUnits,
		}
	} else {
		return undefined;
	}
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
