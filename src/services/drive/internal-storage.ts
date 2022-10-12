import * as fs from 'fs';
import * as Path from 'path';
import config from '../../config';

export class InternalStorage {
	private static readonly path = Path.resolve(__dirname, '../../../files');

	public static resolvePath = (key: string) => Path.resolve(InternalStorage.path, key);

	public static read(key: string) {
		return fs.createReadStream(InternalStorage.resolvePath(key));
	}

	public static async saveFromPathAsync(key: string, srcPath: string) {
		await fs.promises.mkdir(InternalStorage.path, { recursive: true });
		await fs.promises.copyFile(srcPath, InternalStorage.resolvePath(key));
		return `${config.url}/files/${key}`;
	}

	public static async saveFromBufferAsync(key: string, data: Buffer) {
		await fs.promises.mkdir(InternalStorage.path, { recursive: true });
		await fs.promises.writeFile(InternalStorage.resolvePath(key), data);
		return `${config.url}/files/${key}`;
	}

	public static del(key: string) {
		// eslint-disable-next-line node/prefer-promises/fs
		fs.unlink(InternalStorage.resolvePath(key), () => {});
	}
}
