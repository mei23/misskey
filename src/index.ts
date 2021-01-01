/**
 * Misskey Entry Point!
 */

Error.stackTraceLimit = Infinity;

require('events').EventEmitter.defaultMaxListeners = 128;

import * as os from 'os';
import * as cluster from 'cluster';
import * as chalk from 'chalk';
import Xev from 'xev';

import Logger from './services/logger';
import serverStats from './daemons/server-stats';
import queueStats from './daemons/queue-stats';
import loadConfig from './config/load';
import { Config } from './config/types';
import { lessThan } from './prelude/array';
import { program } from './argv';
import { checkMongoDB } from './misc/check-mongodb';
import { showMachineInfo } from './misc/show-machine-info';

const logger = new Logger('core', 'cyan');
const bootLogger = logger.createSubLogger('boot', 'magenta', false);
const clusterLogger = logger.createSubLogger('cluster', 'orange');
const ev = new Xev();
const workerIndex: Record<number, string> = {};

/**
 * Init process
 */
function main() {
	process.title = `Misskey (${cluster.isMaster ? 'master'
		: process.env.WORKER_TYPE === 'server' ? 'server'
		: process.env.WORKER_TYPE === 'queue' ? 'queue'
		: 'worker'})`;

	//#region Load config
	const configLogger = bootLogger.createSubLogger('config');
	let config;

	try {
		config = loadConfig();
	} catch (exception) {
		if (typeof exception === 'string') {
			configLogger.error(exception);
			process.exit(1);
		}
		if (exception.code === 'ENOENT') {
			configLogger.error('Configuration file not found', null, true);
			process.exit(1);
		}
		throw exception;
	}
	configLogger.succ('Loaded');
	//#endregion

	const st = getWorkerStrategies(config);
	if (st.workers + st.servers + st.queues === 0) program.disableClustering = true;

	if (cluster.isMaster || program.disableClustering) {
		masterMain(config);

		if (cluster.isMaster) {
			ev.mount();
		}

		if (program.daemons) {
			serverStats();
			queueStats();
		}
	}

	if (cluster.isWorker || program.disableClustering) {
		workerMain();
	}
}

function greet(config: Config) {
	if (!program.quiet) {
		//#region Misskey logo
		const v = `v${config.version}`;
		console.log('  _____ _         _           ');
		console.log(' |     |_|___ ___| |_ ___ _ _ ');
		console.log(' | | | | |_ -|_ -| \'_| -_| | |');
		console.log(' |_|_|_|_|___|___|_,_|___|_  |');
		console.log(' ' + chalk.gray(v) + ('                        |___|\n'.substr(v.length)));
		//#endregion

		console.log(' Misskey is maintained by @syuilo, @AyaMorisawa, @mei23, @acid-chicken, and @rinsuki.');
		console.log(chalk.keyword('orange')(' If you like Misskey, please donate to support development. https://www.patreon.com/syuilo'));

		console.log('');
		console.log(chalk`< ${os.hostname()} {gray (PID: ${process.pid.toString()})} >`);
	}

	bootLogger.info('Welcome to Misskey!');
	bootLogger.info(`Misskey v${config.version}`, null, true);
}

/**
 * Init master process
 */
async function masterMain(config: Config) {
	try {
		// initialize app
		await init(config);

		greet(config);

		if (config.port == null) {
			bootLogger.error('The port is not configured. Please configure port.', null, true);
			process.exit(1);
		}
	} catch (e) {
		bootLogger.error('Fatal error occurred during initialization', null, true);
		process.exit(1);
	}

	bootLogger.succ('Misskey initialized');

	if (!program.disableClustering) {
		await spawnWorkers(config);
	}

	bootLogger.succ(`Now listening on port ${config.port} on ${config.url}`, null, true);
}

/**
 * Init worker process
 */
async function workerMain() {
	const workerType = process.env.WORKER_TYPE;

	if (workerType === 'server') {
		await require('./server').default();
	} else if (workerType === 'queue') {
		require('./queue').default();
	} else {
		await require('./server').default();
		require('./queue').default();
	}

	// ユニットテスト時にMisskeyが子プロセスで起動された時のため
	// それ以外のときは process.send は使えないので弾く
	if (process.send) {
		process.send('ok');
	}

	if (cluster.isWorker) {
		// Send a 'ready' message to parent process
		if (process.send) {
			process.send('ready');
		}
	}
}

const runningNodejsVersion = process.version.slice(1).split('.').map(x => parseInt(x, 10));
const requiredNodejsVersion = [10, 0, 0];
const satisfyNodejsVersion = !lessThan(runningNodejsVersion, requiredNodejsVersion);

function showEnvironment(): void {
	const env = process.env.NODE_ENV;
	const logger = bootLogger.createSubLogger('env');
	logger.info(typeof env == 'undefined' ? 'NODE_ENV is not set' : `NODE_ENV: ${env}`);

	if (env !== 'production') {
		logger.warn('The environment is not in production mode.');
		logger.warn('DO NOT USE FOR PRODUCTION PURPOSE!', null, true);
	}
}

/**
 * Init app
 */
async function init(config: Config) {
	showEnvironment();

	const nodejsLogger = bootLogger.createSubLogger('nodejs');

	nodejsLogger.info(`Version ${runningNodejsVersion.join('.')}`);

	if (!satisfyNodejsVersion) {
		nodejsLogger.error(`Node.js version is less than ${requiredNodejsVersion.join('.')}. Please upgrade it.`, null, true);
		process.exit(1);
	}

	await showMachineInfo(bootLogger);

	// Try to connect to MongoDB
	try {
		await checkMongoDB(config, bootLogger);
	} catch (e) {
		bootLogger.error('Cannot connect to database', null, true);
		process.exit(1);
	}
}

async function spawnWorkers(config: Config) {
	const st = getWorkerStrategies(config);

	bootLogger.info(`Starting ${st.workers} worker processes`);
	const workerWorkers = await Promise.all([...Array(st.workers)].map(() => spawnWorker('worker')));
	for (const worker of workerWorkers) workerIndex[worker.id] = 'worker';

	bootLogger.info(`Starting ${st.servers} server processes`);
	const serverWorkers = await Promise.all([...Array(st.servers)].map(() => spawnWorker('server')));
	for (const worker of serverWorkers) workerIndex[worker.id] = 'server';

	bootLogger.info(`Starting ${st.queues} queue processes`);
	const queueWorkers = await Promise.all([...Array(st.queues)].map(() => spawnWorker('queue')));
	for (const worker of queueWorkers) workerIndex[worker.id] = 'queue';

	bootLogger.succ('All workers started');
}

export function getWorkerStrategies(config: Config) {
	let workers = 0;
	let servers = 0;
	let queues = 0;

	if (config.workerStrategies) {
		workers = config.workerStrategies.workerWorkerCount || 0;
		servers = config.workerStrategies.serverWorkerCount || 0;
		queues = config.workerStrategies.queueWorkerCount || 0;
	}

	return {
		workers, servers, queues
	};
}

function spawnWorker(type: 'server' | 'queue' | 'worker' = 'worker'): Promise<cluster.Worker> {
	return new Promise((res, rej) => {
		const worker = cluster.fork({ WORKER_TYPE: type });
		worker.on('message', message => {
			if (message !== 'ready') return rej();
			res(worker);
		});
	});
}

//#region Events

// Listen new workers
cluster.on('fork', worker => {
	clusterLogger.debug(`Process forked: [${worker.id}:${worker.process.pid}]`);
});

// Listen online workers
cluster.on('online', worker => {
	clusterLogger.debug(`Process is now online: [${worker.id}:${worker.process.pid}]`);
});

// Listen for dying workers
cluster.on('exit', worker => {
	// Replace the dead worker,
	// we're not sentimental
	clusterLogger.error(chalk.red(`[${worker.id}:${worker.process.pid}] died :(`));
	const type = workerIndex[worker.id] || 'worker';
	const w = cluster.fork({ WORKER_TYPE: type });
	workerIndex[w.id] = type;
});

// Display detail of unhandled promise rejection
if (!program.quiet) {
	process.on('unhandledRejection', console.dir);
}

// Display detail of uncaught exception
process.on('uncaughtException', err => {
	logger.error(err);
});

// Dying away...
process.on('exit', code => {
	logger.info(`The process is going to exit with code ${code}`);
});

//#endregion

main();
