import { Schema } from '../../../misc/schema';

export const schemas = {
	Error: {
		type: 'object',
		properties: {
			error: {
				type: 'object',
				description: 'An error object.',
				properties: {
					code: {
						type: 'string',
						description: 'An error code. Unique within the endpoint.',
					},
					message: {
						type: 'string',
						description: 'An error message.',
					},
					id: {
						type: 'string',
						format: 'uuid',
						description: 'An error ID. This ID is static.',
					}
				},
				required: ['code', 'id', 'message']
			},
		},
		required: ['error']
	},

	User: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this User.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			username: {
				type: 'string',
				description: 'The screen name, handle, or alias that this user identifies themselves with.',
				example: 'ai'
			},
			name: {
				type: 'string',
				nullable: true,
				description: 'The name of the user, as they’ve defined it.',
				example: '藍'
			},
			host: {
				type: 'string',
				nullable: true,
				example: 'misskey.example.com'
			},
			description: {
				type: 'string',
				nullable: true,
				description: 'The user-defined UTF-8 string describing their account.',
				example: 'Hi masters, I am Ai!'
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the user account was created on Misskey.'
			},
			followersCount: {
				type: 'number',
				description: 'The number of followers this account currently has.'
			},
			followingCount: {
				type: 'number',
				description: 'The number of users this account is following.'
			},
			notesCount: {
				type: 'number',
				description: 'The number of Notes (including renotes) issued by the user.'
			},
			isBot: {
				type: 'boolean',
				description: 'Whether this account is a bot.'
			},
			isCat: {
				type: 'boolean',
				description: 'Whether this account is a cat.'
			},
			isAdmin: {
				type: 'boolean',
				description: 'Whether this account is the admin.'
			},
			isVerified: {
				type: 'boolean'
			},
			isLocked: {
				type: 'boolean'
			},
		},
		required: ['id', 'name', 'username', 'createdAt']
	},

	UserList: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this UserList.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the UserList was created.'
			},
			title: {
				type: 'string',
				description: 'The name of the UserList.'
			},
		},
		required: ['id', 'createdAt', 'title']
	},

	MessagingMessage: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this MessagingMessage.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the MessagingMessage was created.'
			},
			text: {
				type: 'string',
				nullable: true
			},
			file: {
				type: 'DriveFile',
				nullable: true
			},
			recipientId: {
				type: 'string',
				format: 'id',
			},
			recipient: {
				$ref: '#/components/schemas/User'
			},
		},
		required: ['id', 'createdAt']
	},

	Poll: {
		type: 'object',
		properties: {
			multiple: {
				type: 'boolean',
				nullable: true,
				description: '複数回答か',
			},
			expiresAt: {
				type: 'string',
				format: 'date-time',
				nullable: true,
				description: '期限、nullは無限。',
			},
			choices: {
				type: 'array',
				format: 'object',
				description: '投票の選択肢',
				items: {
					type: 'object',
					nullable: false,
					properties: {
						id: {
							type: 'number',
							description: '0からのインデックス',
						},
						text: {
							type: 'string',
							description: '選択肢名',
						},
						votes: {
							type: 'number',
							description: '投票数',
						}
					},
				},
			}
		}
	},

	Note: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				optional: false, nullable: false,
				description: 'The unique identifier for this Note.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				nullable: false,
				description: 'The date that the Note was created on Misskey.'
			},
			text: {
				type: 'string',
				nullable: true,
			},
			cw: {
				type: 'string',
				nullable: true,
				description: 'Content warning'
			},
			userId: {
				type: 'string',
				format: 'id',
				nullable: false,
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			user: {
				$ref: '#/components/schemas/User',
				nullable: false,
			},
			replyId: {
				type: 'string',
				format: 'id',
				nullable: true,
				description: 'Note id of the reply target.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			renoteId: {
				type: 'string',
				format: 'id',
				nullable: true,
				description: 'Note id of the renote/quote target.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			reply: {
				type: 'object',
				nullable: true,
				format: 'Note',
				description: 'Note object of the reply target.',
			},
			renote: {
				type: 'object',
				nullable: true,
				format: 'Note',
				description: 'Note object of the renote/quote target.',
			},
			viaMobile: {
				type: 'boolean',
				nullable: true,
			},
			visibility: {
				type: 'string',
				nullable: false,
				description: 'public, home, followers, specified or private',
			},
			fileIds: {
				type: 'array',
				format: 'id',
				nullable: true,
				description: 'Attached DriveFile ids.',
			},
			files: {
				type: 'array',
				format: 'DriveFile',
				nullable: true,
				description: 'Attached DriveFile objects.',
			},
			tags: {
				type: 'array',
				format: 'string',
				nullable: true,
				description: 'Hashtags',
				example: [ 'a', 'b' ]
			},
			reactions: {
				type: 'object',
				nullable: true,
				description: 'Reactions to this note. keyが :なにか: だったら、emojis.name === なにか な emojis.url を画像として表示して、それ以外だったらUnicode絵文字として表示すればいい。',
				example: {
					'🍊': 1,
					':local_custom_emoji@.:': 1,
					':remote_custom_emoji@example.com:': 1,
				}
			},
			emojis: {
				type: 'array',
				format: 'object',
				items: {
					type: 'object',
					nullable: false,
					properties: {
						name: {
							type: 'string',
							nullable: false,
							description: '/[0-9A-Za-z_.@-]+/',
						},
						url: {
							type: 'string',
							nullable: false,
							description: 'Image url',
						},
					},
				},
				nullable: true,
				description: 'Custom/Avatar emoji informations used in text/reactions.',
				example: [
					{ name: 'local_custom_emoji', url: 'xxx'},
					{ name: 'remote_custom_emoji@example.com', url: 'xxx'},
					{ name: '@local_user', url: 'xxx'},
					{ name: '@remote_user@example.com', url: 'xxx'},
					{ name: 'local_custom_reaction@.', url: 'xxx'},
					{ name: 'remote_custom_reaction@example.com', url: 'xxx'},
				]
			},
			localOnly: {
				type: 'boolean',
				nullable: true,
			},
			copyOnce: {
				type: 'boolean',
				nullable: true,
			},
			score: {
				type: 'number',
				nullable: true,
				description: 'Renoted/Quoted/Reacted counts (exclude from BOT).',
			},
			renoteCount: {
				type: 'number',
				nullable: true,
				description: 'Renoted/Quoted counts.',
			},
			quoteCount: {
				type: 'number',
				nullable: true,
				description: 'Quoted counts.',
			},
			repliesCount: {
				type: 'number',
				nullable: true,
				description: 'Replied counts.',
			},
			myReaction: {
				type: 'string',
				nullable: true,
				description: 'If reacted, that reaction.',
				example: '🍊',
			},
			myRenoteId: {
				type: 'string',
				nullable: true,
				description: 'If renoted/quoted, that Note object id.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			poll: {
				$ref: '#/components/schemas/Poll',
				nullable: true,
			},
			url: {
				type: 'string',
				nullable: true,
			},
			uri: {
				type: 'string',
				nullable: true,
			},
		},
	},

	Notification: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this notification.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the notification was created.'
			},
			type: {
				type: 'string',
				enum: ['follow', 'receiveFollowRequest', 'mention', 'reply', 'renote', 'quote', 'reaction', 'poll_vote', 'poll_finished', 'highlight', 'unreadMessagingMessage', '_missing_'],
				description: 'The type of the notification.'
			},
		},
		required: ['id', 'createdAt', 'type']
	},

	DriveFile: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this Drive file.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the Drive file was created on Misskey.'
			},
			name: {
				type: 'string',
				description: 'The file name with extension.',
				example: 'lenna.jpg'
			},
			type: {
				type: 'string',
				description: 'The MIME type of this Drive file.',
				example: 'image/jpeg'
			},
			md5: {
				type: 'string',
				format: 'md5',
				description: 'The MD5 hash of this Drive file.',
				example: '15eca7fba0480996e2245f5185bf39f2'
			},
			datasize: {
				type: 'number',
				description: 'The size of this Drive file. (bytes)',
				example: 51469
			},
			folderId: {
				type: 'string',
				format: 'id',
				nullable: true,
				description: 'The parent folder ID of this Drive file.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			isSensitive: {
				type: 'boolean',
				description: 'Whether this Drive file is sensitive.',
			},
		},
		required: ['id', 'createdAt', 'name', 'type', 'datasize', 'md5']
	},

	DriveFolder: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this Drive folder.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the Drive folder was created.'
			},
			name: {
				type: 'string',
				description: 'The folder name.',
			},
			foldersCount: {
				type: 'number',
				description: 'The count of child folders.',
			},
			filesCount: {
				type: 'number',
				description: 'The count of child files.',
			},
			parentId: {
				type: 'string',
				format: 'id',
				nullable: true,
				description: 'The parent folder ID of this folder.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			parent: {
				$ref: '#/components/schemas/DriveFolder'
			},
		},
		required: ['id', 'createdAt', 'name']
	},

	Muting: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this mute.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the mute was created.'
			},
			mutee: {
				$ref: '#/components/schemas/User',
				description: 'The mutee.'
			},
		},
		required: ['id', 'createdAt', 'mutee']
	},

	Blocking: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this block.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the block was created.'
			},
			blockee: {
				$ref: '#/components/schemas/User',
				description: 'The blockee.'
			},
		},
		required: ['id', 'createdAt', 'blockee']
	},

	Reaction: {
		type: 'object',
		properties: {
			id: {
				type: 'string',
				format: 'id',
				description: 'The unique identifier for this reaction.',
				example: 'xxxxxxxxxxxxxxxxxxxxxxxx',
			},
			createdAt: {
				type: 'string',
				format: 'date-time',
				description: 'The date that the reaction was created.'
			},
			user: {
				$ref: '#/components/schemas/User',
				description: 'User who performed this reaction.'
			},
			type: {
				type: 'string',
				enum: [
					'like',
					'love',
					'laugh',
					'hmm',
					'surprise',
					'congrats',
					'angry',
					'confused',
					'rip',
					'pudding',
					'star'
				],
				description: 'The reaction type.'
			},
		},
		required: ['id', 'createdAt', 'user', 'type']
	},

	Hashtag: {
		type: 'object',
		properties: {
			tag: {
				type: 'string',
				description: 'The hashtag name. No # prefixed.',
				example: 'misskey',
			},
			mentionedUsersCount: {
				type: 'number',
				description: 'Number of all users using this hashtag.'
			},
			mentionedLocalUsersCount: {
				type: 'number',
				description: 'Number of local users using this hashtag.'
			},
			mentionedRemoteUsersCount: {
				type: 'number',
				description: 'Number of remote users using this hashtag.'
			},
			attachedUsersCount: {
				type: 'number',
				description: 'Number of all users who attached this hashtag to profile.'
			},
			attachedLocalUsersCount: {
				type: 'number',
				description: 'Number of local users who attached this hashtag to profile.'
			},
			attachedRemoteUsersCount: {
				type: 'number',
				description: 'Number of remote users who attached this hashtag to profile.'
			},
		},
		required: [
			'tag',
			'mentionedUsersCount',
			'mentionedLocalUsersCount',
			'mentionedRemoteUsersCount',
			'attachedUsersCount',
			'attachedLocalUsersCount',
			'attachedRemoteUsersCount',
		]
	},

	Page: {
		type: 'object' as const,
		optional: false as const, nullable: false as const,
		properties: {
			id: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				format: 'id',
				example: 'xxxxxxxxxx',
			},
			createdAt: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				format: 'date-time',
			},
			updatedAt: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				format: 'date-time',
			},
			title: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
			},
			name: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
			},
			summary: {
				type: 'string' as const,
				optional: false as const, nullable: true as const,
			},
			content: {
				type: 'array' as const,
				optional: false as const, nullable: false as const,
			},
			variables: {
				type: 'array' as const,
				optional: false as const, nullable: false as const,
			},
			userId: {
				type: 'string' as const,
				optional: false as const, nullable: false as const,
				format: 'id',
			},
			user: {
				type: 'object' as const,
				ref: 'User',
				optional: false as const, nullable: false as const,
			},
		}
	},

	XEmoji: {
		type: 'object',
		properties: {
			name: {
				type: 'string',
				description: 'name',
				example: 'name',
			},
			url: {
				type: 'string',
				description: 'url',
				example: 'example.com',
			},
		},
		required: [
			'name',
			'url',
		]
	},
};

export function convertSchemaToOpenApiSchema(schema: Schema) {
	const res: any = schema;

	if (schema.type === 'object' && schema.properties) {
		res.required = Object.entries(schema.properties).filter(([k, v]) => !v.optional).map(([k]) => k);

		for (const k of Object.keys(schema.properties)) {
			res.properties[k] = convertSchemaToOpenApiSchema(schema.properties[k]);
		}
	}

	if (schema.type === 'array' && schema.items) {
		res.items = convertSchemaToOpenApiSchema(schema.items);
	}

	if (schema.ref) {
		res.$ref = `#/components/schemas/${schema.ref}`;
	}

	return res;
}
