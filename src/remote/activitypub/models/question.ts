import config from '../../../config';
import Note, { IChoice, IPoll } from '../../../models/note';
import Resolver from '../resolver';
import { IObject, IQuestion, isQuestion,  } from '../type';
import { apLogger } from '../logger';

export async function extractPollFromQuestion(source: string | IObject, resolver?: Resolver): Promise<IPoll> {
	if (resolver == null) resolver = new Resolver();

	const question = await resolver.resolve(source);

	if (!isQuestion(question)) {
		throw new Error('invalid type');
	}

	const multiple = !question.oneOf;
	const expiresAt = question.endTime ? new Date(question.endTime) : question.closed ? new Date(question.closed) : null;

	if (multiple && !question.anyOf) {
		throw 'invalid question';
	}

	const choices = (question[multiple ? 'anyOf' : 'oneOf'] || [])
		.map((x, i) => ({
			id: i,
			text: x.name,
			votes: x.replies && x.replies.totalItems || x._misskey_votes || 0,
		} as IChoice));

	if (choices.length > 100) throw 'too many choices';

	return {
		choices,
		multiple,
		expiresAt
	};
}

/**
 * Update votes of Question
 * @param uri URI of AP Question object
 * @returns true if updated
 */
export async function updateQuestion(value: any, resolver?: Resolver) {
	const uri = typeof value == 'string' ? value : value.id;

	// URIがこのサーバーを指しているならスキップ
	if (uri.startsWith(config.url + '/')) throw 'uri points local';

	//#region このサーバーに既に登録されているか
	const note = await Note.findOne({ uri });

	if (note == null) throw 'Question is not registed';
	//#endregion

	// resolve new Question object
	if (resolver == null) resolver = new Resolver();
	const question = await resolver.resolve(value) as IQuestion;
	apLogger.debug(`fetched question: ${JSON.stringify(question, null, 2)}`);

	if (question.type !== 'Question') throw 'object is not a Question';

	const apChoices = question.oneOf || question.anyOf;
	const dbChoices = note.poll.choices;

	let changed = false;

	for (const db of dbChoices) {
		const oldCount = db.votes;
		const newCount = apChoices.filter(ap => ap.name === db.text)[0].replies.totalItems;

		if (oldCount != newCount) {
			changed = true;
			db.votes = newCount;
		}
	}

	await Note.update({
		_id: note._id
	}, {
		$set: {
			'poll.choices': dbChoices,
			updatedAt: new Date(),
		}
	});

	return changed;
}
