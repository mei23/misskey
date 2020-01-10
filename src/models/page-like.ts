import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import db from '../db/mongodb';
import { dbLogger } from '../db/logger';
import { packPage } from './page';
import { transform } from '../misc/cafy-id';

const PageLike = db.get<IPageLike>('pageLikes');
PageLike.createIndex(['userId', 'pageId'], { unique: true });
PageLike.createIndex('pageId');

export default PageLike;

export type IPageLike = {
	_id: mongo.ObjectID;
	createdAt: Date;
	userId: mongo.ObjectID;
	pageId: mongo.ObjectID;
};

export async function packPageLikeMany(likes: IPageLike[], meId?: mongo.ObjectID) {
	return Promise.all(likes.map(x => packPageLike(x, meId)));
}

export async function packPageLike(src: string | mongo.ObjectID | IPageLike, meId?: mongo.ObjectID) {
	const populated = typeof src === 'object' ? deepcopy(src) as IPageLike : await PageLike.findOne({ _id: transform(src) });

	// (データベースの欠損などで)投稿がデータベース上に見つからなかったとき
	if (populated == null) {
		dbLogger.warn(`[DAMAGED DB] (missing) pkg: pageLike :: ${src}`);
		return null;
	}

	return {
		id: populated._id,
		page: await packPage(populated.pageId, meId),
	};
}
