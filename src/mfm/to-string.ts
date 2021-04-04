import { MfmNode } from './prelude';
import { nyaize } from '../misc/nyaize';

export type RestoreOptions = {
	doNyaize?: boolean;
};

export function toString(nodes: MfmNode[] | null, opts?: RestoreOptions): string {
	if (nodes === null) return '';

	function appendChildren(nodes: MfmNode[], opts?: RestoreOptions): string {
		return nodes.map(node => {
			const handler = handlers[node.type];
			return handler ? handler(node, opts) : ''
		}).join('');
	}

	const handlers: { [key: string]: ((node: MfmNode, opts?: RestoreOptions) => string) | undefined } = {
		bold(node, opts) {
			return `**${appendChildren(node.children, opts)}**`;
		},

		big(node, opts) {
			return `***${appendChildren(node.children, opts)}***`;
		},

		fn(node, opts) {
			const name = node.props?.name;
			const args = node.props?.args || {};
			const argsStr = Object.entries(args).map(([k, v]) => v === true ? k : `${k}=${v}`).join(',');
			return `[${name}${argsStr !== '' ? '.' + argsStr : ''} ${appendChildren(node.children, opts)}]`;
		},

		small(node, opts) {
			return `<small>${appendChildren(node.children, opts)}</small>`;
		},

		strike(node, opts) {
			return `~~${appendChildren(node.children, opts)}~~`;
		},

		italic(node, opts) {
			return `<i>${appendChildren(node.children, opts)}</i>`;
		},

		motion(node, opts) {
			return `<motion>${appendChildren(node.children, opts)}</motion>`;
		},

		spin(node, opts) {
			const attr = node.props?.attr;
			const post = attr ? ` ${attr}` : '';
			return `<spin${post}>${appendChildren(node.children, opts)}</spin>`;
		},

		rotate(node, opts) {
			const attr = node.props?.attr;
			const post = attr ? ` ${attr}` : '';
			return `<rotate${post}>${appendChildren(node.children, opts)}</rotate>`;
		},

		xspin(node, opts) {
			const attr = node.props?.attr;
			const post = attr ? ` ${attr}` : '';
			return `<xspin${post}>${appendChildren(node.children, opts)}</xspin>`;
		},

		yspin(node, opts) {
			const attr = node.props?.attr;
			const post = attr ? ` ${attr}` : '';
			return `<yspin${post}>${appendChildren(node.children, opts)}</yspin>`;
		},

		jump(node, opts) {
			return `<jump>${appendChildren(node.children, opts)}</jump>`;
		},

		flip(node, opts) {
			return `<flip>${appendChildren(node.children, opts)}</flip>`;
		},

		vflip(node, opts) {
			return `<vflip>${appendChildren(node.children, opts)}</vflip>`;
		},

		marquee(node, opts) {
			const attr = node.props?.attr;
			const post = attr ? ` ${attr}` : '';
			return `<marquee${post}>${appendChildren(node.children, opts)}</marquee>`;
		},

		blockCode(node) {
			return `\`\`\`${node.props.lang || ''}\n${node.props.code}\n\`\`\`\n`;
		},

		center(node, opts) {
			return `<center>${appendChildren(node.children, opts)}</center>`;
		},

		emoji(node) {
			return (node.props.emoji ? node.props.emoji : `:${node.props.name}:`);
		},

		hashtag(node) {
			return `#${node.props.hashtag}`;
		},

		inlineCode(node) {
			return `\`${node.props.code}\``;
		},

		mathInline(node) {
			return `\\(${node.props.formula}\\)`;
		},

		mathBlock(node) {
			return `\\[${node.props.formula}\\]`;
		},

		link(node, opts) {
			if (node.props.silent) {
				return `?[${appendChildren(node.children, opts)}](${node.props.url})`;
			} else {
				return `[${appendChildren(node.children, opts)}](${node.props.url})`;
			}
		},

		mention(node) {
			return node.props.canonical;
		},

		quote(node) {
			return `${appendChildren(node.children, {doNyaize: false}).replace(/^/gm, '>').trim()}\n`;
		},

		title(node, opts) {
			return `[${appendChildren(node.children, opts)}]\n`;
		},

		text(node, opts) {
			return (opts && opts.doNyaize) ? nyaize(node.props.text) : node.props.text;
		},

		url(node) {
			return `<${node.props.url}>`;
		},

		search(node, opts) {
			const query = node.props.query;
			return `${(opts && opts.doNyaize ? nyaize(query) : query)} [search]\n`;
		}
	};

	return appendChildren(nodes, { doNyaize: (opts && opts.doNyaize) || false }).trim();
}
