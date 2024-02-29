import User, { isRemoteUser, IRemoteUser, isLocalUser, ILocalUser } from '../../models/user';
import Following from '../../models/following';
import { deliver } from '../../queue';
import { InboxInfo } from '../../queue/types';
import { isBlockedHost, isClosedHost, isSelfSilencedHost } from '../../services/instance-moderation';
import { publicToHome } from '../../queue/processors/deliver';
import { genEd25519KeyPair } from 'node-http-message-signatures';

//#region types
interface IRecipe {
	type: string;
}

interface IFollowersRecipe extends IRecipe {
	type: 'Followers';
}

interface IDirectRecipe extends IRecipe {
	type: 'Direct';
	to: IRemoteUser;
}

const isFollowers = (recipe: any): recipe is IFollowersRecipe =>
	recipe.type === 'Followers';

const isDirect = (recipe: any): recipe is IDirectRecipe =>
	recipe.type === 'Direct';
//#endregion

export default class DeliverManager {
	private actor: ILocalUser;
	private activity: any;
	private recipes: IRecipe[] = [];

	/**
	 * Constructor
	 * @param actor Actor
	 * @param activity Activity to deliver
	 */
	constructor(actor: ILocalUser, activity: any) {
		this.actor = actor;
		this.activity = activity;
	}

	/**
	 * Add recipe for followers deliver
	 */
	public addFollowersRecipe() {
		const deliver = {
			type: 'Followers'
		} as IFollowersRecipe;

		this.addRecipe(deliver);
	}

	/**
	 * Add recipe for direct deliver
	 * @param to To
	 */
	public addDirectRecipe(to: IRemoteUser) {
		const recipe = {
			type: 'Direct',
			to
		} as IDirectRecipe;

		this.addRecipe(recipe);
	}

	/**
	 * Add recipe
	 * @param recipe Recipe
	 */
	public addRecipe(recipe: IRecipe) {
		this.recipes.push(recipe);
	}

	/**
	 * Execute delivers
	 */
	public async execute(lowSeverity = false) {
		if (!isLocalUser(this.actor)) return;

		prepareEd25519Key(this.actor);

		const inboxes: InboxInfo[] = [];

		const addToDeliver = (inbox: InboxInfo) => {
			if (inbox.url == null) return;
			if (!inbox.url.match(/^https?:/)) return;
			if (inboxes.map(x => x.url).includes(inbox.url)) return;
			inboxes.push(inbox);
		};

		if (this.recipes.some(r => isFollowers(r))) {
			// followers deliver
			const followers = await Following.find({
				followeeId: this.actor._id
			});

			for (const following of followers) {
				const follower = following._follower;

				if (isRemoteUser(follower)) {
					const inbox: InboxInfo = follower.sharedInbox ? {
						origin: 'sharedInbox',
						url: follower.sharedInbox
					} : {
						origin: 'inbox',
						url: follower.inbox,
						userId: `${follower._id}`
					};

					addToDeliver(inbox);
				}
			}
		}

		for (const recipe of this.recipes.filter((recipe): recipe is IDirectRecipe => isDirect(recipe))) {
			// direct deliver
			const inbox: InboxInfo = {
				origin: 'inbox',
				url: recipe.to.inbox,
				userId: `${recipe.to._id}`
			};

			if (recipe.to.sharedInbox && inboxes.some(x => x.url === recipe.to.sharedInbox)) {
				// skip
			} else if (recipe.to.inbox) {
				addToDeliver(inbox);
			}
		}

		// deliver
		for (const inbox of inboxes) {
			try {
				const { host } = new URL(inbox.url);
				if (await isBlockedHost(host)) continue;
				if (await isClosedHost(host)) continue;

				if (await isSelfSilencedHost(host)) {
					const act = publicToHome(this.activity, this.actor); 
					deliver(this.actor, act, inbox.url, lowSeverity, inbox);
				} else {
					deliver(this.actor, this.activity, inbox.url, lowSeverity, inbox);
				}

			} catch { }
		}
	}
}

//#region Utilities
/**
 * Deliver activity to followers
 * @param activity Activity
 * @param from Followee
 */
export async function deliverToFollowers(actor: ILocalUser, activity: any, lowSeverity = false) {
	const manager = new DeliverManager(actor, activity);
	manager.addFollowersRecipe();
	await manager.execute(lowSeverity);
}

/**
 * Deliver activity to user
 * @param activity Activity
 * @param to Target user
 */
export async function deliverToUser(actor: ILocalUser, activity: any, to: IRemoteUser, lowSeverity = false) {
	const manager = new DeliverManager(actor, activity);
	manager.addDirectRecipe(to);
	await manager.execute(lowSeverity);
}

async function prepareEd25519Key(actor: ILocalUser) {
	if (actor.ed25519Key != null) return;

	const ed25519KeyPair = await genEd25519KeyPair();

	await User.update({ _id: actor._id }, {
		$set: {
			ed25519Key: ed25519KeyPair.privateKey,
		}
	});
}
//#endregion
