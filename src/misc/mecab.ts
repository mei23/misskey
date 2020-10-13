import { parse as parseMfm } from '../mfm/parse';
import toText from '../mfm/toText';
import toWord from '../mfm/toWord';
import config from '../config';
import { unique } from '../prelude/array';
import { spawn } from 'child_process';
import * as util from 'util';
import * as stream from 'stream';
import * as memoryStreams from 'memory-streams';
import { EOL } from 'os';

const pipeline = util.promisify(stream.pipeline);

export async function getIndexer(note: Partial<Record<'text' | 'cw', string>>): Promise<string[]> {
	const source = `${note.text || ''} ${note.cw || ''}`;
	const text = toText(parseMfm(source)!);
	const tokens = await me(text);
	return unique(tokens.filter(token => ['フィラー', '感動詞', '形容詞', '連体詞', '動詞', '副詞', '名詞'].includes(token[1])).map(token => token[0]));
}

export async function getWordIndexer(note: Partial<Record<'text' | 'cw', string>>): Promise<string[]> {
	const source = `${note.text || ''} ${note.cw || ''}`;
	const text = toWord(parseMfm(source)!);
	const tokens = await me(text);
	const words = unique(tokens.filter(token => token[2] === '固有名詞').map(token => token[0]));

	// is とか to が固有名詞扱いで入ってしまうので英字のみは飛ばしてしまう
	const filtered = words.filter(x => !x.match(/^[A-Za-z.,\s]+$/));
	return filtered;
}

async function me(text: string): Promise<string[][]> {
	if (config.mecabSearch?.mecabBin) {
		return await mecab(text, config.mecabSearch.mecabBin, config.mecabSearch.mecabDic)
	}

	return [];
}

/**
 * Run MeCab
 * @param text Text to analyze
 * @param mecab mecab bin
 * @param dic mecab dictionaly path
 */
async function mecab(text: string, mecab = 'mecab', dic?: string): Promise<string[][]> {
	const args: string[] = [];
	if (dic) args.push('-d', dic);

	const lines = await cmd(mecab, args, `${text.replace(/[\n\s\t]/g, ' ')}\n`);

	const results: string[][] = [];

	for (const line of lines) {
		if (line === 'EOS') break;
		const [word, value = ''] = line.split('\t');
		const array = value.split(',');
		array.unshift(word);
		results.push(array);
	}

	return results;
}

async function cmd(command: string, args: string[], stdin: string): Promise<string[]> {
	const mecab = spawn(command, args);

	const writable = new memoryStreams.WritableStream();

	mecab.stdin.write(stdin);
	mecab.stdin.end();

	await pipeline(mecab.stdout, writable);

	return writable.toString().split(EOL);
}
