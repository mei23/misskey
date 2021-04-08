import { MfmNode, MfmEmojiNode } from '../mfm/prelude';
import { unique } from '../prelude/array';

export default function(nodes: MfmNode[]): string[] {
	const emojiNodes = nodes.filter(x => x.type === 'emoji') as MfmEmojiNode[];
	const emojis = emojiNodes.filter(x => x.props.name && x.props.name.length <= 2048).map(x => x.props.name);
	return unique(emojis);
}
