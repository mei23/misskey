import * as crypto from 'crypto';
import { parseInt } from 'lodash';

//  4bit Fixed hex value '7'
// 44bit UNIX Time ms in Hex
// 48bit Random value in Hex

function getTime(time: number, radix: number, length: number) {
	if (time < 0) time = 0;

	return time.toString(radix).padStart(length, '0').slice(length * -1);
}

function getRandomHex(bytes: number) {
	let str = '';

	for (let i = 0; i < bytes; i++) {
		str += crypto.randomBytes(1).readUInt8().toString(16).padStart(2, '0');
	}

	return str;
}

export function genMeid7(date: Date): string {
	if (date.toString() === 'Invalid Date') throw 'Invalid Date';
	return '7' + getTime(date.getTime(), 16, 11) + getRandomHex(6);
}

export function meid7ToDate(id?: string): Date | null {
	const m = id?.match(/^7([0-9a-f]{11})([0-9a-f]{12})$/);
	if (m == null) return null;
	const int = parseInt(m[1], 16);
	return new Date(int);
}
