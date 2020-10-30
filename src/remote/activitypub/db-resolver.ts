import * as mongo from 'mongodb';
import config from '../../config';
import User, { IUser, IRemoteUser } from '../../models/user';
import Note, { INote } from '../../models/note';
import { IObject, getApId } from './type';
import * as escapeRegexp from 'escape-regexp';
import MessagingMessage, { IMessagingMessage } from '../../models/messaging-message';

export default class DbResolver {
	constructor() {
	}

	/**
	 * AP Note => Misskey Note in DB
	 */
	public async getNoteFromApId(value: string | IObject): Promise<INote | null> {
		const parsed = this.parseUri(value);

		if (parsed.id) {
			return (await Note.findOne({
				_id: new mongo.ObjectID(parsed.id),
				deletedAt: { $exists: false }
			})) || null;
		}

		if (parsed.uri) {
			return (await Note.findOne({
				uri: parsed.uri,
				deletedAt: { $exists: false }
			})) || null;
		}

		return null;
	}

	public async getMessageFromApId(value: string | IObject): Promise<IMessagingMessage | null> {
		const parsed = this.parseUri(value);

		if (parsed.id) {
			return (await MessagingMessage.findOne({
				_id: new mongo.ObjectID(parsed.id),
				deletedAt: { $exists: false }
			})) || null;
		}

		if (parsed.uri) {
			return (await MessagingMessage.findOne({
				uri: parsed.uri,
				deletedAt: { $exists: false }
			})) || null;
		}

		return null;
	}

	public async getRemoteUserFromKeyId(keyId: string): Promise<IRemoteUser | null> {
		const user = await User.findOne({
			host: { $ne: null },
			'publicKey.id': keyId,
			deletedAt: { $exists: false }
		}) as IRemoteUser;

		return user || null;
	}

	/**
	 * AP Person => Misskey User in DB
	 */
	public async getUserFromApId(value: string | IObject): Promise<IUser | null> {
		const parsed = this.parseUri(value);

		if (parsed.id) {
			return (await User.findOne({
				_id: new mongo.ObjectID(parsed.id),
				deletedAt: { $exists: false }
			})) || null;
		}

		if (parsed.uri) {
			return (await User.findOne({
				uri: parsed.uri,
				deletedAt: { $exists: false }
			})) || null;
		}

		return null;
	}

	public parseUri(value: string | IObject): UriParseResult {
		const uri = getApId(value);

		const localRegex = new RegExp('^' + escapeRegexp(config.url) + '/' + '(\\w+)' + '/' + '(\\w+)');
		const matchLocal = uri.match(localRegex);

		if (matchLocal) {
			return {
				type: matchLocal[1],
				id: matchLocal[2]
			};
		} else {
			return {
				uri
			};
		}
	}
}

type UriParseResult = {
	/** id in DB (local object only) */
	id?: string;
	/** uri in DB (remote object only) */
	uri?: string;
	/** hint of type (local object only, ex: notes, users) */
	type?: string
};
