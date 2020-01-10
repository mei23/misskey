import * as mongo from 'mongodb';
import * as deepcopy from 'deepcopy';
import rap from '@prezzemolo/rap';
import db from '../db/mongodb';
import { pack as packUser } from './user';
import DriveFile, { pack as packDriveFile, packMany as packDriveFileMany, IDriveFile } from './drive-file';
import { dbLogger } from '../db/logger';
import PageLike from './page-like';
import { transform } from '../misc/cafy-id';

const Page = db.get<IPage>('pages');
Page.createIndex(['userId', 'name'], { unique: true });
Page.createIndex('name');

export default Page;

export type IPage = {
	_id: mongo.ObjectID;
	createdAt: Date;
	updatedAt: Date;
	title: string;
	name: string;
	summary: string;
	alignCenter: boolean;
	hideTitleWhenPinned: boolean;
	font: string;
	userId: mongo.ObjectID;
	eyeCatchingImageId: mongo.ObjectID;
	content: Record<string, any>[];
	variables: Record<string, any>[];
	visibility: 'public' | 'followers' | 'specified';
	visibleUserIds: mongo.ObjectID[];
	likedCount: number;
};

export async function packPageMany(pages: IPage[], meId?: mongo.ObjectID) {
	return Promise.all(pages.map(x => packPage(x, meId)));
}

export async function packPage(src: string | mongo.ObjectID | IPage, meId?: mongo.ObjectID) {
	const populated = typeof src === 'object' ? deepcopy(src) as IPage : await Page.findOne({ _id: transform(src) });

	// (データベースの欠損などで)投稿がデータベース上に見つからなかったとき
	if (populated == null) {
		dbLogger.warn(`[DAMAGED DB] (missing) pkg: page :: ${src}`);
		return null;
	}

	const attachedFileIds: mongo.ObjectID[] = [];

	const collectFile = (xs: any[]) => {
		for (const x of xs) {
			if (x.type === 'image') {
				attachedFileIds.push(x.fileId);
			}
			if (x.children) {
				collectFile(x.children);
			}
		}
	};
	collectFile(populated.content);

	const result = {
		id: populated._id,
		createdAt: populated.createdAt.toISOString(),
		updatedAt: populated.updatedAt.toISOString(),
		userId: populated.userId,
		user: packUser(populated.userId),
		content: populated.content,
		variables: populated.variables,
		title: populated.title,
		name: populated.name,
		summary: populated.summary,
		hideTitleWhenPinned: populated.hideTitleWhenPinned,
		alignCenter: populated.alignCenter,
		font: populated.font,
		eyeCatchingImageId: populated.eyeCatchingImageId,
		eyeCatchingImage: populated.eyeCatchingImageId ? await packDriveFile(populated.eyeCatchingImageId) : null,
		attachedFiles: packDriveFileMany(attachedFileIds),
		likedCount: populated.likedCount,
		isLiked: meId && (await PageLike.findOne({ pageId: populated._id, userId: meId })) != null,
	};

	return await rap(result);
}
