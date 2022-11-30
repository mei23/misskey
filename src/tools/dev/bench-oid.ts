import { genMeid7 } from '../../misc/id/meid7';
import { oidIncludes } from '../../prelude/oid';
import { ObjectID } from 'mongodb';
import { performance } from 'perf_hooks';

const follows: string[] = [];
const excepts: string[] = [];
const excepts2: string[] = [];

// gen ids
for (let i = 0; i < 2000; i++) {
	const id = new ObjectID(genMeid7(new Date()));
	follows.push(id);
	if (i % 2 === 0) excepts.push(id);
}

for (let i = 0; i < 2000; i++) {
	const id = new ObjectID(genMeid7(new Date()));
	excepts2.push(id);
}

const begin = performance.now();
follows
	.filter(x => !oidIncludes(excepts, x))
	.filter(x => !oidIncludes(excepts2, x))
const after = performance.now();

console.log(after - begin);
