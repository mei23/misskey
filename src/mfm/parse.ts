import { mfmLanguage } from './language';
import { MfmNode } from './prelude';
import { normalize } from './normalize';

/**
 * すべて (インライン＋ブロック)
 */
export function parseFull(source: string): MfmNode[] | null {
	if (source == null || source == '') return null;
	return normalize(mfmLanguage.root.tryParse(source));
}

/**
 * 絵文字のみ
 */
export function parsePlain(source: string): MfmNode[] | null {
	if (source == null || source == '') return null;
	return normalize(mfmLanguage.plain.tryParse(source));
}

/**
 * インライン要素のみ
 */
export function parsePlainX(source: string): MfmNode[] | null {
	if (source == null || source == '') return null;
	return normalize(mfmLanguage.plainX.tryParse(source));
}

/**
 * メンション, タグ, URL, リンク, コード のみ
 */
export function parseBasic(source: string): MfmNode[] | null {
	if (source == null || source == '') return null;
	return normalize(mfmLanguage.basic.tryParse(source));
}

/**
 * メンション, タグ, URL, リンク のみ
 */
export function parseThin(source: string): MfmNode[] | null {
	if (source == null || source == '') return null;
	return normalize(mfmLanguage.thin.tryParse(source));
}
