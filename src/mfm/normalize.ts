import { concat } from '../prelude/array';
import { EndoRelation } from '../prelude/relation';
import { MfmNode, createMfmNode } from './prelude';

function isEmptyTextNode(node: MfmNode): boolean {
	return node.type == 'text' && node.props.text === '';
}

function concatTextNodes(nodes: MfmNode[]): MfmNode {
	return createMfmNode('text', { text: nodes.map(node => node.props.text).join('') });
}

function concatIfTextNodes(nodes: MfmNode[]): MfmNode[] {
	return nodes[0].type === 'text' ? [concatTextNodes(nodes)] : nodes;
}

function concatConsecutiveTextTrees(nodes: MfmNode[]): MfmNode[] {
	const us = concat(groupOn(node => node.type, nodes).map(concatIfTextNodes));
	return us.map(node => createMfmNode(node.type, node.props, concatConsecutiveTextTrees(node.children)));
}

function removeEmptyTextNodes(nodes: MfmNode[]): MfmNode[] {
	return nodes
		.filter(node => !isEmptyTextNode(node))
		.map(node => createMfmNode(node.type, node.props, removeEmptyTextNodes(node.children)));
}

export function normalize(nodes: MfmNode[]): MfmNode[] {
	return removeEmptyTextNodes(concatConsecutiveTextTrees(nodes));
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
