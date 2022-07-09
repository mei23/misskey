/**
 * 投稿を表す文字列を取得します。
 * @param {*} note (packされた)投稿
 */
const summarize = (note: any): string => {
	if (note.deletedAt) {
		return '(削除された投稿)';
	}

	if (note.isHidden) {
		return '(非公開の投稿)';
	}

	let summary = '';

	// 本文
	if (note.cw != null) {
		summary += note.cw;
	} else {
		summary += note.text ? note.text : '';
	}

	// ファイルが添付されているとき
	if ((note.files || []).length != 0) {
		summary += ` (📎${note.files.length})`;
	}

	// 投票が添付されているとき
	if (note.poll) {
		summary += ' (投票)';
	}

	// 返信のとき
	if (note.replyId) {
		if (note.reply) {
			summary += `\n\nRE: ${summarize(note.reply)}`;
		} else {
			summary += '\n\nRE: ...';
		}
	}

	// Renoteのとき
	if (note.renoteId) {
		if (note.renote) {
			summary += `\n\nRN: ${summarize(note.renote)}`;
		} else {
			summary += '\n\nRN: ...';
		}
	}

	return summary.trim();
};

export default summarize;
