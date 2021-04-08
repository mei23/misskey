import { MfmNode } from './prelude';

const check = (x?: string) => x && x.length;

function visit(node: MfmNode): string {
	switch (node.type) {
		case 'titlePlain':
		case 'atPlain': {
			return node.props.raw;
		}

		case 'search': {
			return node.props.query;
		}

		case 'codeBlock':
		case 'codeInline': {
			return [node.props.lang, node.props.code].filter(check).join(' ');
		}

		case 'hashtag': {
			return `#${node.props.hashtag}`;
		}

		case 'text': {
			return node.props.text;
		}

		default: {
			if (node.children.length) {
				return node.children.map(visit).join(' ');
			}

			return '';
		}
	}
}

export default (nodes: MfmNode[]) => (nodes || []).map(visit).join(' ');
