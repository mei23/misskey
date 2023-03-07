import { JSDOM } from 'jsdom';
import config from '../config';
import { INote } from '../models/note';
import { concat } from '../prelude/array';
import { MfmNode, isMfmLink } from './types';

export function toHtml(nodes: MfmNode[] | null, mentionedRemoteUsers: INote['mentionedRemoteUsers'] = []) {
	if (nodes == null) {
		return null;
	}

	const { window } = new JSDOM('');

	const doc = window.document;

	function appendChildren(nodes: MfmNode[], targetElement: HTMLElement): void {
		for (const node of nodes) {
			targetElement.appendChild(nodeToElement(node));
		}
	}

	function nodeToElement(node: MfmNode): HTMLElement | Text {
		/*
		function nodeToData(node: MfmNode, baseElement: 'i' | 'b' = 'i' ): HTMLElement {
			const el = doc.createElement(baseElement);
			el.setAttribute('data-mfm', node.props.name ?? node.type)
			for (const key of Object.keys(node.props.args || {})) {
				const val = node.props.args[key];
				el.setAttribute(`data-mfm-${key}`, typeof val === 'boolean' ? '1' : val);
			}
			appendChildren(node.children, el);
			return el;
		}
		*/

		if (node.type === 'text') {
			const el = doc.createElement('span');
			const nodes = (node.props.text as string).split(/\r\n|\r|\n/).map(x => doc.createTextNode(x) as Node);

			for (const x of intersperse<Node | 'br'>('br', nodes)) {
				el.appendChild(x === 'br' ? doc.createElement('br') : x);
			}

			return el;
		}

		if (node.type === 'emoji') {
			return doc.createTextNode(node.props.emoji ? node.props.emoji : `:${node.props.name}:`);
		}

		if (node.type === 'mention') {
			const a = doc.createElement('a');
			const { username, host, acct } = node.props;
			const remoteUserInfo = mentionedRemoteUsers.find(remoteUser => remoteUser.username === username && remoteUser.host === host);
			a.href = remoteUserInfo ? (remoteUserInfo.url || remoteUserInfo.uri) : `${config.url}/${acct}`;
			a.className = 'u-url mention';
			a.textContent = acct;
			return a;
		}

		if (node.type === 'hashtag') {
			const a = doc.createElement('a');
			a.href = `${config.url}/tags/${node.props.hashtag}`;
			a.textContent = `#${node.props.hashtag}`;
			a.setAttribute('rel', 'tag');
			return a;
		}

		if (node.type === 'url') {
			const a = doc.createElement('a');

			a.href = node.props.url;
			try {
				a.href = new URL(a.href).href;
			} catch { }

			a.textContent = node.props.url;
			return a;
		}

		if (isMfmLink(node)) {
			const a = doc.createElement('a');

			a.href = node.props.url;
			try {
				a.href = new URL(a.href).href;
			} catch { }

			appendChildren(node.children, a);
			return a;
		}

		if (node.type === 'quote') {
			const el = doc.createElement('blockquote');
			appendChildren(node.children, el);
			return el;
		}

		if (node.type === 'blockCode') {
			const pre = doc.createElement('pre');
			const inner = doc.createElement('code');
			inner.textContent = node.props.code;
			if (node.props.lang) inner.setAttribute('data-lang', node.props.lang)
			pre.appendChild(inner);
			return pre;
		}

		if (node.type === 'inlineCode') {
			const el = doc.createElement('code');
			el.textContent = node.props.code;
			return el;
		}

		if (node.type === 'title') {
			const el = doc.createElement('h1');
			appendChildren(node.children, el);
			return el;
		}

		if (node.type === 'bold') {
			const el = doc.createElement('b');
			appendChildren(node.children, el);
			return el;
		}

		if (node.type === 'small') {
			const el = doc.createElement('small');
			appendChildren(node.children, el);
			return el;
		}

		if (node.type === 'strike') {
			const el = doc.createElement('del');
			appendChildren(node.children, el);
			return el;
		}

		if (node.type === 'italic') {
			const el = doc.createElement('i');
			appendChildren(node.children, el);
			return el;
		}

		/*
		if (['sub', 'sup'].includes(node.type)) {
			const el = doc.createElement(node.type);
			appendChildren(node.children, el);
			return el;
		}

		if (['fn'].includes(node.type)) {
			return nodeToData(node, 'i');
		}
		*/

		const el = doc.createElement('i');
		if (node.children) appendChildren(node.children, el);
		return el;
	}

	appendChildren(nodes, doc.body);

	return `<p>${doc.body.innerHTML}</p>`;
}

/**
 * Intersperse the element between the elements of the array
 * @param sep The element to be interspersed
 */
function intersperse<T>(sep: T, xs: T[]): T[] {
	return concat(xs.map(x => [sep, x])).slice(1);
}
