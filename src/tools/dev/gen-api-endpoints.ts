// npx ts-node --swc src/tools/dev/gen-api-endpoints.ts

import { resolve } from 'path';
import * as glob from 'glob';
import { writeFileSync } from 'fs';

const rootDir = resolve(__dirname, '../../../');
const endpointsDir = resolve(rootDir, 'src/server/api/endpoints');
const endpointsFile = resolve(rootDir, 'src/server/api/files.ts');

const files = glob.sync('**/*.ts', {
	cwd: endpointsDir
}).map(x => x.replace(/[.]ts$/, ''));

console.log(`Saving ... ${endpointsFile}`);
writeFileSync(endpointsFile, `/* eslint-disable quotes */\nexport default ${JSON.stringify(files, null, 2)};\n`);
