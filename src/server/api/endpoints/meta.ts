import $ from 'cafy';
import config from '../../../config';
import define from '../define';
import { buildMeta } from '../../../misc/build-meta';
import fetchMeta from '../../../misc/fetch-meta';

export const meta = {
	stability: 'stable',

	desc: {
		'ja-JP': 'インスタンス情報を取得します。',
		'en-US': 'Get the information of this instance.'
	},

	tags: ['meta'],

	requireCredential: false,

	allowGet: true,
	cacheSec: 60,

	params: {
		detail: {
			validator: $.optional.boolean,
			default: true,
		}
	},

	res: {
		type: 'object',
		properties: {
			version: {
				type: 'string',
				description: 'The version of Misskey of this instance.',
				example: config.version
			},
			name: {
				type: 'string',
				description: 'The name of this instance.',
			},
			description: {
				type: 'string',
				description: 'The description of this instance.',
			},
			announcements: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						title: {
							type: 'string',
							description: 'The title of the announcement.',
						},
						text: {
							type: 'string',
							description: 'The text of the announcement. (can be HTML)',
						},
					}
				},
				description: 'The announcements of this instance.',
			},
			disableRegistration: {
				type: 'boolean',
				description: 'Whether disabled open registration.',
			},
			disableLocalTimeline: {
				type: 'boolean',
				description: 'Whether disabled LTL and STL.',
			},
			disableGlobalTimeline: {
				type: 'boolean',
				description: 'Whether disabled GTL.',
			},
			enableEmojiReaction: {
				type: 'boolean',
				description: 'Whether enabled emoji reaction.',
			},
		}
	}
};

export default define(meta, async (ps, me) => {
	const instance = await fetchMeta();
	const response = await buildMeta(instance, ps.detail);
	return response;
});
