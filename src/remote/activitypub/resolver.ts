import { StatusError } from '../../misc/fetch';
import { IObject, isCollection, isOrderedCollection, isCollectionPage, isOrderedCollectionPage } from './type';
import { ILocalUser } from '../../models/user';
import { getInstanceActor } from '../../services/instance-actor';
import { apGet } from './request';
import config from '../../config';
import { extractApHost } from '../../misc/convert-host';
import { isBlockedHost } from '../../services/instance-moderation';

export default class Resolver {
	private history: Set<string>;
	private user?: ILocalUser;
	private recursionLimit?: number;

	constructor(recursionLimit = 200) {
		this.history = new Set();
		this.recursionLimit = recursionLimit;
	}

	public getHistory(): string[] {
		return Array.from(this.history);
	}

	public async resolveCollection(value: string | IObject) {
		const collection = typeof value === 'string'
			? await this.resolve(value)
			: value;

		if (isCollection(collection) || isOrderedCollection(collection) || isCollectionPage(collection) || isOrderedCollectionPage(collection)) {
			return collection;
		} else {
			throw new Error(`unknown collection type: ${collection.type}`);
		}
	}

	public async resolve(value: string | IObject): Promise<IObject> {
		if (value == null) {
			throw new Error('resolvee is null (or undefined)');
		}

		if (typeof value !== 'string') {
			return value;
		}

		if (this.history.has(value)) {
			throw new Error('cannot resolve already resolved one');
		}

		if (this.recursionLimit && this.history.size > this.recursionLimit) {
			throw new Error('hit recursion limit');
		}

		this.history.add(value);

		if (!value.match(/^https?:/)) {
			throw new StatusError('Bad protocol', 400, 'Bad protocol');
		}

		const host = extractApHost(value);
		// ブロックしてたら中断
		if (await isBlockedHost(host)) {
			throw new StatusError('Blocked instance', 451, 'Blocked instance');
		}

		if (config.signToActivityPubGet !== false && !this.user) {
			this.user = await getInstanceActor();
		}

		const { object, res } = await apGet(value, this.user);

		if (object === null || (
			Array.isArray(object['@context']) ?
				!object['@context'].includes('https://www.w3.org/ns/activitystreams') :
				object['@context'] !== 'https://www.w3.org/ns/activitystreams'
		)) {
			throw new StatusError(`Invalid @context`, 482);
		}

		// reject no object id
		if (object.id == null) {
			throw new StatusError(`Object has no ID`, 482);
		}

		// final landing url === responsed object id => success
		if (res.url === object.id) {
			return object;
		}

		// reject final landing host !== responsed object id host
		if (new URL(res.url).host !== new URL(object.id).host) {
			throw new StatusError(`Object ID host doesn't match final url host`, 482);
		}

		// second attempt by first id
		const second = await apGet(object.id, this.user);

		// final landing url === responsed object id => success
		if (second.res.url !== second.object.id) {
			throw new StatusError(`Object ID still doesn't match final URL after second fetch attempt`, 482);
		}

		return second.object;
	}
}
