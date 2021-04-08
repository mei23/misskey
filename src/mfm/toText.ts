import { MfmForest, MfmTree } from './prelude';

const check = (x?: string) => x && x.length;

function visit(tree: MfmTree): string {
	switch (tree.node.type) {
		case 'titlePlain':
		case 'atPlain': {
			return tree.node.props.raw;
		}

		case 'search': {
			return tree.node.props.query;
		}

		case 'codeBlock':
		case 'codeInline': {
			return [tree.node.props.lang, tree.node.props.code].filter(check).join(' ');
		}

		case 'mathBlock':
		case 'mathInline': {
			return tree.node.props.formula;
		}

		/*
		case 'mention': {
			return tree.node.props.canonical;
		}
		*/

		case 'hashtag': {
			return `#${tree.node.props.hashtag}`;
		}

		case 'url': {
			return tree.node.props.url;
		}

		case 'emoji': {
			return tree.node.props.emoji || `:${tree.node.props.name}:`;
		}

		case 'text': {
			return tree.node.props.text;
		}

		default: {
			if (tree.children.length) {
				return tree.children.map(visit).join(' ');
			}

			return '';
		}
	}
}

export default (forest: MfmForest) => (forest || []).map(visit).join(' ');
