import * as os from 'os';
import * as v8 from 'v8';

console.log(`Node Version: ${process.version}`);
console.log(`Node ExecPath: ${process.execPath}`);
console.log(`OS Platform: ${os.platform()}`);
console.log(`OS Arch: ${os.arch()}`);
console.log(`vCPU: ${os.cpus().length}`);
console.log(`TotalMem: ${Math.floor(os.totalmem() / 1024 / 1024)} MiB`);
console.log(`HeapSizeLimit: ${Math.floor(v8.getHeapStatistics().heap_size_limit / 1024 / 1024)} MiB`);
