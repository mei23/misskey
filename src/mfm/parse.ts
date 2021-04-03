import { mfmLanguage } from './language';
import { MfmForest } from './prelude';
import { normalize } from './normalize';

/**
 * すべて (インライン＋ブロック)
 */
export function parseFull(source: string): MfmForest | null {
	if (source == null || source == '') {
		return null;
	}

	return normalize(mfmLanguage.root.tryParse(source));
}

/**
 * 絵文字のみ
 */
export function parsePlain(source: string): MfmForest | null {
	if (source == null || source == '') {
		return null;
	}

	return normalize(mfmLanguage.plain.tryParse(source));
}

/**
 * インライン要素のみ
 */
export function parsePlainX(source: string): MfmForest | null {
	if (source == null || source == '') {
		return null;
	}

	return normalize(mfmLanguage.plainX.tryParse(source));
}

export function parseBasic(source: string): MfmForest | null {
	if (source == null || source == '') {
		return null;
	}

	return normalize(mfmLanguage.basic.tryParse(source));
}
