/*
 * Tests of toString
 *
 * How to run the tests:
 * > mocha test/toString.ts --require ts-node/register
 *
 * To specify test:
 * > mocha test/toString.ts --require ts-node/register -g 'test name'
 */
import * as assert from 'assert';
import { parseFull } from '../src/mfm/parse';
import { toString } from '../src/mfm/to-string';

describe('toString', () => {
	it('太字', () => {
		assert.deepStrictEqual(toString(parseFull('**太字**')), '**太字**');
	});
	it('中央揃え', () => {
		assert.deepStrictEqual(toString(parseFull('<center>中央揃え</center>')), '<center>中央揃え</center>');
	});
	it('打ち消し線', () => {
		assert.deepStrictEqual(toString(parseFull('~~打ち消し線~~')), '~~打ち消し線~~');
	});
	it('小さい字', () => {
		assert.deepStrictEqual(toString(parseFull('<small>小さい字</small>')), '<small>小さい字</small>');
	});
	it('モーション', () => {
		assert.deepStrictEqual(toString(parseFull('<motion>モーション</motion>')), '<motion>モーション</motion>');
	});
	it('モーション2', () => {
		assert.deepStrictEqual(toString(parseFull('(((モーション)))')), '<motion>モーション</motion>');
	});
	it('ビッグ＋', () => {
		assert.deepStrictEqual(toString(parseFull('*** ビッグ＋ ***')), '*** ビッグ＋ ***');
	});
	it('回転', () => {
		assert.deepStrictEqual(toString(parseFull('<spin>回転</spin>')), '<spin>回転</spin>');
	});
	it('右回転', () => {
		assert.deepStrictEqual(toString(parseFull('<spin right>右回転</spin>')), '<spin right>右回転</spin>');
	});
	it('左回転', () => {
		assert.deepStrictEqual(toString(parseFull('<spin left>左回転</spin>')), '<spin left>左回転</spin>');
	});
	it('往復回転', () => {
		assert.deepStrictEqual(toString(parseFull('<spin alternate>往復回転</spin>')), '<spin alternate>往復回転</spin>');
	});
	it('ジャンプ', () => {
		assert.deepStrictEqual(toString(parseFull('<jump>ジャンプ</jump>')), '<jump>ジャンプ</jump>');
	});
	it('コードブロック', () => {
		assert.deepStrictEqual(toString(parseFull('```\nコードブロック\n```')), '```\nコードブロック\n```');
	});
	it('インラインコード', () => {
		assert.deepStrictEqual(toString(parseFull('`インラインコード`')), '`インラインコード`');
	});
	it('引用行', () => {
		assert.deepStrictEqual(toString(parseFull('>引用行')), '>引用行');
	});
	it('検索', () => {
		assert.deepStrictEqual(toString(parseFull('検索 [search]')), '検索 [search]');
	});
	it('リンク', () => {
		assert.deepStrictEqual(toString(parseFull('[リンク](http://example.com)')), '[リンク](http://example.com)');
	});
	it('詳細なしリンク', () => {
		assert.deepStrictEqual(toString(parseFull('?[詳細なしリンク](http://example.com)')), '?[詳細なしリンク](http://example.com)');
	});
	it('【タイトル】', () => {
		assert.deepStrictEqual(toString(parseFull('【タイトル】')), '[タイトル]');
	});
	it('[タイトル]', () => {
		assert.deepStrictEqual(toString(parseFull('[タイトル]')), '[タイトル]');
	});
	it('インライン数式', () => {
		assert.deepStrictEqual(toString(parseFull('\\(インライン数式\\)')), '\\(インライン数式\\)');
	});
	it('ブロック数式', () => {
		assert.deepStrictEqual(toString(parseFull('\\\[\nブロック数式\n\]\\')), '\\\[\nブロック数式\n\]\\');
	});
	it('上下反転', () => {
		assert.deepStrictEqual(toString(parseFull('<vflip>上下反転</vflip>')), '<vflip>上下反転</vflip>');
	});
	it('指定角度回転', () => {
		assert.deepStrictEqual(toString(parseFull('<rotate 30>指定角度回転</rotate>')), '<rotate 30>指定角度回転</rotate>');
	});
	it('X軸回転', () => {
		assert.deepStrictEqual(toString(parseFull('<xspin>X軸回転</xspin>')), '<xspin>X軸回転</xspin>');
	});
	it('Y軸回転', () => {
		assert.deepStrictEqual(toString(parseFull('<yspin>Y軸回転</yspin>')), '<yspin>Y軸回転</yspin>');
	});
	it('マーキー', () => {
		assert.deepStrictEqual(toString(parseFull('<marquee>マーキー (右から左へ)</marquee>')), '<marquee>マーキー (右から左へ)</marquee>');
	});
	it('マーキー2', () => {
		assert.deepStrictEqual(toString(parseFull('<marquee reverse>マーキー (左から右へ)</marquee>')), '<marquee reverse>マーキー (左から右へ)</marquee>');
	});
	it('マーキー3', () => {
		assert.deepStrictEqual(toString(parseFull('<marquee reverse-slide>マーキー (左から出てきて右で停止)</marquee>')), '<marquee reverse-slide>マーキー (左から出てきて右で停止)</marquee>');
	});
});
