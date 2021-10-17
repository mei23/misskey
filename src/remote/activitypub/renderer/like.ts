import config from '../../../config';
import { INote } from '../../../models/note';
import { INoteReaction } from '../../../models/note-reaction';
import Emoji from '../../../models/emoji';
import renderEmoji from './emoji';

export const renderLike = async (noteReaction: INoteReaction, note: INote) => {
	const reaction = generalMap[noteReaction.reaction] || noteReaction.reaction;
	const object =  {
		type: noteReaction.dislike ? 'Dislike' : 'Like',
		id: `${config.url}/likes/${noteReaction._id}`,
		actor: `${config.url}/users/${noteReaction.userId}`,
		object: note.uri ? note.uri : `${config.url}/notes/${noteReaction.noteId}`,
		published: noteReaction.createdAt.toISOString(),
		content: reaction,
		_misskey_reaction: reaction
	} as any;

	if (reaction.startsWith(':')) {
		const name = reaction.replace(/:/g, '');
		const emoji = await Emoji.findOne({
			name,
			host: null
		});

		if (emoji) object.tag = [ renderEmoji(emoji) ];
	}

	return object;
};

const generalMap: Record<string, string> = {
	'like': '👍',
	'love': '❤',	// ここに記述する場合は異体字セレクタを入れない
	'laugh': '😆',
	'hmm': '🤔',
	'surprise': '😮',
	'congrats': '🎉',
	'angry': '💢',
	'confused': '😥',
	'rip': '😇',
	'pudding': '🍮',
	'star': '⭐',
};
