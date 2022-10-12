import { ObjectID } from 'mongodb';

/**
 * typeがObjectIDか、stringじゃダメ
 */
export default function(x: any): x is ObjectID {
	return x && typeof x === 'object' && (
			Object.prototype.hasOwnProperty.call(x, 'toHexString') 
			||
			Object.prototype.hasOwnProperty.call(x, '_bsontype')
		);
}
