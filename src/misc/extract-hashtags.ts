import { MfmNode, MfmHashtagNode } from '../mfm/prelude';
import { unique } from '../prelude/array';

export default function(nodes: MfmNode[]): string[] {
	const hashtagNodes = nodes.filter(x => x.type === 'hashtag') as MfmHashtagNode[];
	const hashtags = hashtagNodes.map(x => x.props.hashtag);
	return unique(hashtags);
}
