import { JSDOM } from 'jsdom';
import config from '../config';
import { INote } from '../models/note';
import { concat } from '../prelude/array';
import { MfmForest, MfmTree } from './prelude';
import { inspect } from 'util';
import note from '../remote/activitypub/kernel/create/note';

export function toHtml(tokens: MfmForest, mentionedRemoteUsers: INote['mentionedRemoteUsers'] = []) {
	if (tokens == null) {
		return null;
	}

	const { window } = new JSDOM('');

	const doc = window.document;

	function appendChildren(children: MfmForest, targetElement: any): void {
		for (const child of children.map(t => handlers[t.node.type](t))) targetElement.appendChild(child);
	}

	const handlers: { [key: string]: (token: MfmTree) => any } = {
		bold(token) {
			const el = doc.createElement('b');
			appendChildren(token.children, el);
			return el;
		},

		big(token) {
			const el = doc.createElement('strong');
			appendChildren(token.children, el);
			return el;
		},

		small(token) {
			const el = doc.createElement('small');
			appendChildren(token.children, el);
			return el;
		},

		strike(token) {
			const el = doc.createElement('del');
			appendChildren(token.children, el);
			return el;
		},

		italic(token) {
			const el = doc.createElement('i');
			appendChildren(token.children, el);
			return el;
		},

		motion(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'jelly');
			appendChildren(token.children, el);
			return el;
		},

		spin(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'spin');
			if (token.node.props.attr === 'left') el.setAttribute('data-mfm-left', '1');
			if (token.node.props.attr === 'alternate') el.setAttribute('data-mfm-alternate', '1');
			appendChildren(token.children, el);
			return el;
		},

		xspin(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'spin');
			el.setAttribute('data-mfm-x', '1');
			appendChildren(token.children, el);
			return el;
		},

		yspin(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'spin');
			el.setAttribute('data-mfm-y', '1');
			appendChildren(token.children, el);
			return el;
		},

		jump(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'jump');
			appendChildren(token.children, el);
			return el;
		},

		flip(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'flip');
			appendChildren(token.children, el);
			return el;
		},

		vflip(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'flip');
			el.setAttribute('data-mfm-v', '1');
			appendChildren(token.children, el);
			return el;
		},

		rotate(token) {
			const el = doc.createElement('span');
			el.setAttribute('data-mfm', 'rotate');
			el.setAttribute('data-mfm-deg', token.node.props.attr);
			appendChildren(token.children, el);
			return el;
		},

		blockCode(token) {
			const pre = doc.createElement('pre');
			const inner = doc.createElement('code');
			if (token.node.props.lang) inner.setAttribute('data-mfm-lang', token.node.props.lang);
			inner.textContent = token.node.props.code;
			pre.appendChild(inner);
			return pre;
		},

		center(token) {
			const el = doc.createElement('div');
			el.setAttribute('align', 'center');
			appendChildren(token.children, el);
			return el;
		},

		marquee(token) {
			const el = doc.createElement('marquee');
			if (token.node.props.attr === 'reverse') {
				el.setAttribute('direction', 'right');
			} else if (token.node.props.attr === 'alternate') {
				el.setAttribute('behavior', 'alternate');
			} else if (token.node.props.attr === 'slide') {
				el.setAttribute('behavior', 'slide');
			} else if (token.node.props.attr === 'reverse-slide') {
				el.setAttribute('direction', 'right');
				el.setAttribute('behavior', 'slide');
			}
			appendChildren(token.children, el);
			return el;
		},

		emoji(token) {
			return doc.createTextNode(token.node.props.emoji ? token.node.props.emoji : `:${token.node.props.name}:`);
		},

		hashtag(token) {
			const a = doc.createElement('a');
			a.href = `${config.url}/tags/${token.node.props.hashtag}`;
			a.textContent = `#${token.node.props.hashtag}`;
			a.setAttribute('rel', 'tag');
			return a;
		},

		inlineCode(token) {
			const el = doc.createElement('code');
			el.textContent = token.node.props.code;
			return el;
		},

		mathInline(token) {
			const el = doc.createElement('code');
			el.setAttribute('data-mfm', 'math');
			el.textContent = token.node.props.formula;
			return el;
		},

		mathBlock(token) {
			const el = doc.createElement('code');
			el.setAttribute('data-mfm', 'math');
			el.textContent = token.node.props.formula;
			return el;
		},

		link(token) {
			const a = doc.createElement('a');
			a.href = token.node.props.url;
			appendChildren(token.children, a);
			return a;
		},

		mention(token) {
			const a = doc.createElement('a');
			const { username, host, acct } = token.node.props;
			const remoteUserInfo = mentionedRemoteUsers.find(remoteUser => remoteUser.username === username && remoteUser.host === host);
			a.href = remoteUserInfo ? (remoteUserInfo.url || remoteUserInfo.uri) : `${config.url}/${acct}`;
			a.className = 'u-url mention';
			a.textContent = acct;
			return a;
		},

		quote(token) {
			const el = doc.createElement('blockquote');
			appendChildren(token.children, el);
			return el;
		},

		title(token) {
			const el = doc.createElement('h1');
			appendChildren(token.children, el);
			return el;
		},

		text(token) {
			const el = doc.createElement('span');
			const nodes = (token.node.props.text as string).split(/\r\n|\r|\n/).map(x => doc.createTextNode(x) as Node);

			for (const x of intersperse<Node | 'br'>('br', nodes)) {
				el.appendChild(x === 'br' ? doc.createElement('br') : x);
			}

			return el;
		},

		url(token) {
			const a = doc.createElement('a');
			a.href = token.node.props.url;
			a.textContent = token.node.props.url;
			return a;
		},

		search(token) {
			const a = doc.createElement('a');
			a.href = `https://www.google.com/search?q=${encodeURIComponent(token.node.props.query)}`;
			a.textContent = token.node.props.content;
			return a;
		}
	};

	appendChildren(tokens, doc.body);

	return `<p>${doc.body.innerHTML}</p>`;
}

/**
 * Intersperse the element between the elements of the array
 * @param sep The element to be interspersed
 */
function intersperse<T>(sep: T, xs: T[]): T[] {
	return concat(xs.map(x => [sep, x])).slice(1);
}
