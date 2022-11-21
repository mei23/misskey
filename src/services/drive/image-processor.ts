import * as sharp from 'sharp';

export type IImage = {
	data: Buffer;
	ext: string;
	type: string;
};

type JpegOpts = {
	quality?: number;
	disableSubsampling?: boolean;
	useMozjpeg?: boolean;
};

type WebpOpts = {
	quality?: number;
};

/**
 * Convert to JPEG
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToJpeg(path: string, width: number, height: number, jpegOpts?: JpegOpts): Promise<IImage> {
	return convertSharpToJpeg(await sharp(path), width, height, jpegOpts);
}

export async function convertSharpToJpeg(sharp: sharp.Sharp, width: number, height: number, jpegOpts?: JpegOpts): Promise<IImage> {
	const jpegOptions: sharp.JpegOptions = {
		progressive: true,
		quality: jpegOpts?.quality || 85,
		chromaSubsampling: jpegOpts?.disableSubsampling ? '4:4:4' : '4:2:0',	// undefinedにするとなぜかデフォルトの4:2:0でなく4:4:4になってしまう
		mozjpeg: jpegOpts?.useMozjpeg ? true : false,
	};

	const data = await sharp
		.resize(width, height, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.rotate()
		.jpeg(jpegOptions)
		.toBuffer();

	return {
		data,
		ext: 'jpg',
		type: 'image/jpeg'
	};
}

/**
 * Convert to WebP
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToWebp(path: string, width: number, height: number, webpOpts?: WebpOpts): Promise<IImage> {
	return convertSharpToWebp(await sharp(path), width, height);
}

export async function convertSharpToWebp(sharp: sharp.Sharp, width: number, height: number, webpOpts?: WebpOpts): Promise<IImage> {
	const webpOptions: sharp.WebpOptions = {
		quality: webpOpts?.quality || 85,
	};

	const data = await sharp
		.resize(width, height, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.rotate()
		.webp(webpOptions)
		.toBuffer();

	return {
		data,
		ext: 'webp',
		type: 'image/webp'
	};
}

/**
 * Convert to AVIF
 *   with resize, remove metadata, resolve orientation, stop animation
 */
 export async function convertToAvif(path: string, width: number, height: number, avifOpts?: AvifOpts): Promise<IImage> {
	return convertSharpToAvif(await sharp(path), width, height);
}

export async function convertSharpToAvif(sharp: sharp.Sharp, width: number, height: number, avifOpts?: AvifOpts): Promise<IImage> {
	const avifOptions: sharp.AvifOptions = {
		quality: avifOpts?.quality || 65,
	};

	const data = await sharp
		.resize(width, height, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.rotate()
		.avif(avifOptions)
		.toBuffer();

	return {
		data,
		ext: 'avif',
		type: 'image/avif'
	};
}

/**
 * Convert to PNG
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToPng(path: string, width: number, height: number): Promise<IImage> {
	return convertSharpToPng(await sharp(path), width, height);
}

export async function convertSharpToPng(sharp: sharp.Sharp, width: number, height: number): Promise<IImage> {
	const data = await sharp
		.resize(width, height, {
			fit: 'inside',
			withoutEnlargement: true
		})
		.rotate()
		.png()
		.toBuffer();

	return {
		data,
		ext: 'png',
		type: 'image/png'
	};
}

/**
 * Convert to PNG or JPEG
 *   with resize, remove metadata, resolve orientation, stop animation
 */
export async function convertToPngOrJpeg(path: string, width: number, height: number): Promise<IImage> {
	return convertSharpToPngOrJpeg(await sharp(path), width, height);
}

export async function convertSharpToPngOrJpeg(sharp: sharp.Sharp, width: number, height: number): Promise<IImage> {
	const stats = await sharp.stats();
	const metadata = await sharp.metadata();

	// 不透明で300x300pxの範囲を超えていればJPEG
	if (stats.isOpaque && (metadata.width >= 300 || metadata.height >= 300)) {
		return await convertSharpToJpeg(sharp, width, height);
	} else {
		return await convertSharpToPng(sharp, width, height);
	}
}
