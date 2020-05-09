import define from '../../../define';
import NoteWatching from '../../../../../models/note-watching';

export const meta = {
	desc: {
		'ja-JP': '指定した投稿のウォッチを全解除します。',
		'en-US': 'Unwatch all.'
	},

	tags: ['notes'],

	requireCredential: true,

	kind: ['write:account', 'account-write', 'account/write'],

	params: {
	},
};

export default define(meta, async (ps, me) => {
	await NoteWatching.remove({
		userId: me._id
	});
});
