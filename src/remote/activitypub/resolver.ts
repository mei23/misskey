import { getJson } from '../../misc/fetch';
import { IObject, isCollection, isOrderedCollection, isCollectionPage, isOrderedCollectionPage } from './type';
import { ILocalUser } from '../../models/user';
import { getInstanceActor } from '../../services/instance-actor';
import { signedGet } from './request';
import config from '../../config';

export default class Resolver {
	private history: Set<string>;
	private user?: ILocalUser;

	constructor() {
		this.history = new Set();
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

		this.history.add(value);

		console.log(`ResolveRequest: ${value}`);

		if (config.signToActivityPubGet && !this.user) {
			this.user = await getInstanceActor();
		}

		const object = this.user
			? await signedGet(value, this.user)
			: await getJson(value, 'application/activity+json, application/ld+json');

		if (object === null || (
			Array.isArray(object['@context']) ?
				!object['@context'].includes('https://www.w3.org/ns/activitystreams') :
				object['@context'] !== 'https://www.w3.org/ns/activitystreams'
		)) {
			throw {
				name: `InvalidResponse`,
				statusCode: 482,
				message: `Invalid @context`
			};
		}

		return object;
	}
}

type MockResponse = {
	type: string;
	content: string;
};

export class MockResolver extends Resolver {
	//#region For mock
	private _rs = new Map<string, MockResponse>();
	public async _register(uri: string, content: string | Object, type = 'application/activity+json') {
		this._rs.set(uri, {
			type,
			content: typeof content === 'string' ? content : JSON.stringify(content)
		});
	}
	//#endregion

	//#region Overrides
	public async resolve(value: string | IObject): Promise<IObject> {
		if (typeof value !== 'string') return value;

		const r = this._rs.get(value);

		if (!r) {
			throw {
				name: `StatusError`,
				statusCode: 404,
				message: `Not registed for mock`
			};
		}

		const object = JSON.parse(r.content);

		return object;
	}
	//#endregion
}
