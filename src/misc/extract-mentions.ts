// test is located in test/extract-mentions

import { MfmNode, MfmMentionNode } from '../mfm/prelude';

/**
 * Extract mentions
 * @param nodes parseBasicの結果を入れる
 */
export default function(nodes: MfmNode[]): MfmMentionNode['props'][] {
	// TODO: 重複を削除
	const mentionNodes = nodes.filter(x => x.type === 'mention') as MfmMentionNode [];
	return mentionNodes.map(x => x.props);
}
