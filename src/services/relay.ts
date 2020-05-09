import * as mongo from 'mongodb';
import User, { ILocalUser } from '../models/user';
import Relay, { IRelay } from '../models/relay';
import { createSystemUser } from './create-system-user';
import { renderFollowRelay } from '../remote/activitypub/renderer/follow-relay';
import { renderActivity, attachLdSignature } from '../remote/activitypub/renderer';
import renderUndo from '../remote/activitypub/renderer/undo';
import { deliver } from '../queue';

const ACTOR_USERNAME = 'relay.actor' as const;

export async function getRelayActor(): Promise<ILocalUser> {
	const user = await User.findOne({
		host: null,
		username: ACTOR_USERNAME
	});

	if (user) return user as ILocalUser;

	const created = await createSystemUser(ACTOR_USERNAME);
	return created as ILocalUser;
}

export async function addRelay(inbox: string) {
	const relay = await Relay.insert({
		inbox,
		status: 'requesting'
	}) as IRelay;

	const relayActor = await getRelayActor();
	const follow = await renderFollowRelay(relay, relayActor);
	const activity = renderActivity(follow);
	deliver(relayActor, activity, relay.inbox);

	return relay;
}

export async function removeRelay(inbox: string) {
	const relay = await Relay.findOne({
		inbox
	});

	if (relay == null) {
		throw 'relay not found';
	}

	const relayActor = await getRelayActor();
	const follow = renderFollowRelay(relay, relayActor);
	const undo = renderUndo(follow, relayActor);
	const activity = renderActivity(undo);
	deliver(relayActor, activity, relay.inbox);

	await Relay.remove({
		_id: relay._id
	});
}

export async function listRelay() {
	const relays = await Relay.find();
	return relays;
}

export async function relayAccepted(id: string) {
	const result = await Relay.update(new mongo.ObjectID(id), {
		$set: {
			status: 'accepted'
		}
	});

	return JSON.stringify(result);
}

export async function relayRejected(id: string) {
	const result = await Relay.update(new mongo.ObjectID(id), {
		$set: {
			status: 'rejected'
		}
	});

	return JSON.stringify(result);
}

export async function deliverToRelays(user: ILocalUser, activity: any) {
	const relays = await Relay.find({
		status: 'accepted'
	});
	if (relays.length === 0) return;

	const relayActor = await getRelayActor();

	const copy = JSON.parse(JSON.stringify(activity));
	if (!copy.to) copy.to = ['https://www.w3.org/ns/activitystreams#Public'];

	const x = await attachLdSignature(copy, user);

	for (const relay of relays) {
		deliver(relayActor, x, relay.inbox);
	}
}
