import { INote } from '../../../models/note';
import { toHtml } from '../../../mfm/to-html';
import { parseFull } from '../../../mfm/parse';

export function getNoteHtml(note: INote, apAppend?: string) {
	let noMisskeyContent = false;
	const srcMfm = (note.text ?? '') + (apAppend ?? '');

	const nodes = parseFull(srcMfm);

	if (!apAppend && nodes?.every(node => ['text', 'emoji', 'mention', 'hashtag', 'url'].includes(node.type))) {
		noMisskeyContent = true;
	}

	let html = toHtml(nodes, note.mentionedRemoteUsers);
	if (html == null) html = '<p>.</p>';

	return {
		content: html,
		noMisskeyContent,
	};
}
