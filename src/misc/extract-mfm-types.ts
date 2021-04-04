import { MfmNode } from '../mfm/prelude';
import { unique, concat } from '../prelude/array';

export default function(nodes: MfmNode[]): string[] {
	return unique(preorderF(nodes).map(x => x.type));
}

function preorder<T>(t: MfmNode): MfmNode[] {
	return [t, ...preorderF(t.children)];
}

function preorderF<T>(ts: MfmNode[]): MfmNode[] {
	return concat(ts.map(preorder));
}
