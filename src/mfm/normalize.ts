import { concat } from '../prelude/array';
import { EndoRelation } from '../prelude/relation';
import { MfmForest, MfmTree } from './prelude';
import { createTree, createLeaf } from '../prelude/tree';

function isEmptyTextTree(t: MfmTree): boolean {
	return t.node.type == 'text' && t.node.props.text === '';
}

function concatTextTrees(ts: MfmForest): MfmTree {
	return createLeaf({ type: 'text', props: { text: ts.map(x => x.node.props.text).join('') } });
}

function concatIfTextTrees(ts: MfmForest): MfmForest {
	return ts[0].node.type === 'text' ? [concatTextTrees(ts)] : ts;
}

function concatConsecutiveTextTrees(ts: MfmForest): MfmForest {
	const us = concat(groupOn(t => t.node.type, ts).map(concatIfTextTrees));
	return us.map(t => createTree(t.node, concatConsecutiveTextTrees(t.children)));
}

function removeEmptyTextNodes(ts: MfmForest): MfmForest {
	return ts
		.filter(t => !isEmptyTextTree(t))
		.map(t => createTree(t.node, removeEmptyTextNodes(t.children)));
}

export function normalize(ts: MfmForest): MfmForest {
	return removeEmptyTextNodes(concatConsecutiveTextTrees(ts));
}

/**
 * Splits an array based on the equivalence relation.
 * The concatenation of the result is equal to the argument.
 */
function _groupBy<T>(f: EndoRelation<T>, xs: T[]): T[][] {
	const groups = [] as T[][];
	for (const x of xs) {
		if (groups.length !== 0 && f(groups[groups.length - 1][0], x)) {
			groups[groups.length - 1].push(x);
		} else {
			groups.push([x]);
		}
	}
	return groups;
}

/**
 * Splits an array based on the equivalence relation induced by the function.
 * The concatenation of the result is equal to the argument.
 */
function groupOn<T, S>(f: (x: T) => S, xs: T[]): T[][] {
	return _groupBy((a, b) => f(a) === f(b), xs);
}
