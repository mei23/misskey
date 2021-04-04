import { JSDOM } from 'jsdom';
import config from '../config';
import { INote } from '../models/note';
import { concat } from '../prelude/array';
import { MfmNode } from './prelude';

export function toHtml(nodes: MfmNode[] | null, mentionedRemoteUsers: INote['mentionedRemoteUsers'] = []) {
	if (nodes == null) {
		return null;
	}

	const { window } = new JSDOM('');

	const doc = window.document;

	function appendChildren(nodes: MfmNode[], targetElement: HTMLElement): void {
		for (const node of nodes) {
			const handler = handlers[node.type];
			if (handler) {
				targetElement.appendChild(handler(node));
			} else {
				console.warn(`Unknown node type ${node.type}. This is a bug.`);
			}
		}
	}

	const handlers: { [key: string]: ((node: MfmNode) => HTMLElement | Text) | undefined } = {
		bold(node) {
			const el = doc.createElement('b');
			appendChildren(node.children, el);
			return el;
		},

		big(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'tada');
			appendChildren(node.children, el);
			return el;
		},

		small(node) {
			const el = doc.createElement('small');
			appendChildren(node.children, el);
			return el;
		},

		strike(node) {
			const el = doc.createElement('del');
			appendChildren(node.children, el);
			return el;
		},

		italic(node) {
			const el = doc.createElement('i');
			appendChildren(node.children, el);
			return el;
		},

		fn(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', node.props.name);
			for (const [key, value] of Object.entries(node.props.args || {})) {
				if (!key.match(/^[a-z]+$/)) continue;
				if (value === false) continue;
				el.setAttribute(`data-mfm-${key}`, (value === true) ? `data-mfm-${key}` : value as string);
			}
			appendChildren(node.children, el);
			return el;
		},

		motion(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'jelly');
			appendChildren(node.children, el);
			return el;
		},

		spin(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'spin');
			if (node.props.attr === 'left') el.setAttribute('data-mfm-left', 'data-mfm-left');
			if (node.props.attr === 'alternate') el.setAttribute('data-mfm-alternate', 'data-mfm-alternate');
			appendChildren(node.children, el);
			return el;
		},

		xspin(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'spin');
			el.setAttribute('data-mfm-x', 'data-mfm-x');
			if (node.props.attr === 'left') el.setAttribute('data-mfm-left', 'data-mfm-left');
			if (node.props.attr === 'alternate') el.setAttribute('data-mfm-alternate', 'data-mfm-alternate');
			appendChildren(node.children, el);
			return el;
		},

		yspin(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'spin');
			el.setAttribute('data-mfm-y', 'data-mfm-y');
			if (node.props.attr === 'left') el.setAttribute('data-mfm-left', 'data-mfm-left');
			if (node.props.attr === 'alternate') el.setAttribute('data-mfm-alternate', 'data-mfm-alternate');
			appendChildren(node.children, el);
			return el;
		},

		jump(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'jump');
			appendChildren(node.children, el);
			return el;
		},

		flip(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'flip');
			appendChildren(node.children, el);
			return el;
		},

		vflip(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'flip');
			el.setAttribute('data-mfm-v', 'data-mfm-v');
			appendChildren(node.children, el);
			return el;
		},

		rotate(node) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'rotate');
			el.setAttribute('data-mfm-deg', node.props.attr);
			appendChildren(node.children, el);
			return el;
		},

		blockCode(node) {
			const pre = doc.createElement('pre');
			const inner = doc.createElement('code');
			if (node.props.lang) inner.setAttribute('data-mfm-lang', node.props.lang);
			inner.textContent = node.props.code;
			pre.appendChild(inner);
			return pre;
		},

		center(node) {
			const el = doc.createElement('div');
			el.setAttribute('align', 'center');
			appendChildren(node.children, el);
			return el;
		},

		marquee(node) {
			const el = doc.createElement('marquee');
			if (node.props.attr === 'reverse') {
				el.setAttribute('direction', 'right');
			} else if (node.props.attr === 'alternate') {
				el.setAttribute('behavior', 'alternate');
			} else if (node.props.attr === 'slide') {
				el.setAttribute('behavior', 'slide');
			} else if (node.props.attr === 'reverse-slide') {
				el.setAttribute('direction', 'right');
				el.setAttribute('behavior', 'slide');
			}
			appendChildren(node.children, el);
			return el;
		},

		emoji(node) {
			return doc.createTextNode(node.props.emoji ? node.props.emoji : `:${node.props.name}:`);
		},

		hashtag(node) {
			const a = doc.createElement('a');
			a.href = `${config.url}/tags/${node.props.hashtag}`;
			a.textContent = `#${node.props.hashtag}`;
			a.setAttribute('rel', 'tag');
			return a;
		},

		inlineCode(node) {
			const el = doc.createElement('code');
			el.textContent = node.props.code;
			return el;
		},

		mathInline(node) {
			const el = doc.createElement('code');
			el.setAttribute('data-mfm', 'math');
			el.textContent = node.props.formula;
			return el;
		},

		mathBlock(node) {
			const el = doc.createElement('code');
			el.setAttribute('data-mfm', 'math');
			el.textContent = node.props.formula;
			return el;
		},

		link(node) {
			const a = doc.createElement('a');
			a.href = node.props.url;
			appendChildren(node.children, a);
			return a;
		},

		mention(node) {
			const a = doc.createElement('a');
			const { username, host, acct } = node.props;
			const remoteUserInfo = mentionedRemoteUsers.find(remoteUser => remoteUser.username === username && remoteUser.host === host);
			a.href = remoteUserInfo ? (remoteUserInfo.url || remoteUserInfo.uri) : `${config.url}/${acct}`;
			a.className = 'u-url mention';
			a.textContent = acct;
			return a;
		},

		quote(node) {
			const el = doc.createElement('blockquote');
			appendChildren(node.children, el);
			return el;
		},

		title(node) {
			const el = doc.createElement('h1');
			appendChildren(node.children, el);
			return el;
		},

		text(node) {
			const el = doc.createElement('span');
			const nodes = (node.props.text as string).split(/\r\n|\r|\n/).map(x => doc.createTextNode(x) as Node);

			for (const x of intersperse<Node | 'br'>('br', nodes)) {
				el.appendChild(x === 'br' ? doc.createElement('br') : x);
			}

			return el;
		},

		url(node) {
			const a = doc.createElement('a');
			a.href = node.props.url;
			a.textContent = node.props.url;
			return a;
		},

		search(node) {
			const a = doc.createElement('a');
			a.href = `https://www.google.com/search?q=${encodeURIComponent(node.props.query)}`;
			a.textContent = node.props.content;
			a.setAttribute('data-mfm', 'search');
			a.setAttribute('data-mfm-query', node.props.query);
			return a;
		}
	};

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
