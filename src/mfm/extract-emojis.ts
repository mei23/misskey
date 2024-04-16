import { MfmNode, isMfmCustomEmoji, isMfmLink } from '../mfm/types';

/**
 * カスタム絵文字を抽出する
 * @param nodes parseBasicの結果を入れる
 */
export function extractEmojis(nodes: MfmNode[]): string[] {
	const emojis = new Set<string>();

	// parseBasicの場合、カスタム絵文字は最上位かlinkの直下にのみある。
	for (const node of nodes) {
		if (isMfmCustomEmoji(node)) {
			emojis.add(node.props.name);
		} else if (isMfmLink(node)) {
			for (const child of node.children) {
				if (isMfmCustomEmoji(child)) emojis.add(child.props.name);
			}
		}
	}

	return [...emojis].filter(x => x.match(/^[\w-]{1,128}$/))
}
