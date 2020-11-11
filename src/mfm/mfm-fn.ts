import { parseFragment, DefaultTreeDocumentFragment } from 'parse5';
import { URL } from 'url';
import { urlRegexFull } from './prelude';

type MfmFn = {
	type: string;
	speed?: string;
	deg?: number;
	x?: boolean;
	y?: boolean;
	h?: boolean;
	v?: boolean;
	left?: boolean;
	alternate?: boolean;
};


