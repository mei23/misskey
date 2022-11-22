/**
 * Misskey Entry Point!
 */

Error.stackTraceLimit = Infinity;

require('events').EventEmitter.defaultMaxListeners = 128;
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || `${Math.min(Math.max(4, require('os').cpus().length), 1024)}`;

import * as os from 'os';
import * as cluster from 'cluster';
import * as chalk from 'chalk';
import Xev from 'xev';

import Logger from './services/logger';
import serverStats from './daemons/server-stats';
import queueStats from './daemons/queue-stats';
import loadConfig from './config/load';
import { Config } from './config/types';
import { envOption } from './env';
import { checkMongoDB } from './misc/check-mongodb';
import { showMachineInfo } from './misc/show-machine-info';

const logger = new Logger('core', 'cyan');
const bootLogger = logger.createSubLogger('boot', 'magenta', false);
const clusterLogger = logger.createSubLogger('cluster', 'orange');
const ev = new Xev();
const workerIndex: Record<number, string> = {};
export let processLabel = 'unknown';

/**
 * Init process
 */
function main() {
	//#region Load config
	const configLogger = bootLogger.createSubLogger('config');
	let config: any;

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

	processLabel = ((): string => {
		if (st.disableClustering) {
			if (st.onlyServer) return 'standalone:server';	// serverのみを実行するstandalone process
			if (st.onlyQueue) return 'standalone:queue';	// queueのみを実行するstandalone process
			return 'standalone';	// server/queueを実行するstandalone process
		}

		if (cluster.isMaster) return 'primary';	// workerをかかえるmaster process
		if (process.env.WORKER_TYPE === 'server') return 'server';	// serverのみを実行するworker process
		if (process.env.WORKER_TYPE === 'queue') return 'queue';	// serverのみを実行するworker process
		return 'worker';	// server/queuを実行するworker process
	})();

	process.title = `Misskey (${processLabel})`;

	if (st.disableClustering) {
		masterMain(config).then(() => {
			ev.mount();

			if (!envOption.noDaemons) {
				serverStats();
				queueStats();
			}

			workerMain(config).then(() => {
				bootLogger.succ(`Now listening on port ${config.port} on ${config.url}`, undefined, true);

				// ユニットテストから起動された場合用
				if (process.send) {
					process.send('ok');
				}
			});
		})
	} else if (cluster.isMaster) {
		masterMain(config).then(() => {
			ev.mount();

			if (!envOption.noDaemons) {
				serverStats();
				queueStats();
			}

			spawnWorkers(config).then(() => {
				bootLogger.succ(`Now listening on port ${config.port} on ${config.url}`, undefined, true);

				// ユニットテストから起動された場合用
				if (process.send) {
					process.send('ok');
				}
			})
		});
	} else {
		workerMain(config);
	}
}

function greet(config: Config) {
	if (!envOption.quiet && process.env.NODE_ENV !== 'test') {
		//#region Meisskey logo
		const v = `v${config.version}`;
		console.log(chalk.red(' '));
		console.log(chalk.red(' • ▌ ▄ ·. ▄▄▄ .▪  .▄▄ · .▄▄ · ▄ •▄ ▄▄▄ . ▄· ▄▌'));
		console.log(chalk.red(' ·██ ▐███▪▀▄.▀·██ ▐█ ▀. ▐█ ▀. █▌▄▌▪▀▄.▀·▐█▪██▌'));
		console.log(chalk.red(` ▐█ ▌▐▌▐█·▐▀▀▪▄▐█·▄▀▀▀█▄▄▀▀▀█▄▐▀▀▄·▐▀▀▪▄▐█▌▐█▪`));
		console.log(chalk.red(' ██ ██▌▐█▌▐█▄▄▌▐█▌▐█▄▪▐█▐█▄▪▐█▐█.█▌▐█▄▄▌ ▐█▀·.'));
		console.log(chalk.red(' ▀▀  █▪▀▀▀ ▀▀▀ ▀▀▀ ▀▀▀▀  ▀▀▀▀ ·▀  ▀ ▀▀▀   ▀ • '));
		console.log(' ' + chalk.redBright(v));
		//#endregion

		console.log('');
		console.log(chalk`< ${os.hostname()} {gray (PID: ${process.pid.toString()})} >`);
	}

	bootLogger.info('Welcome to Meisskey!');
	bootLogger.info(`Meisskey v${config.version}`, undefined, true);
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

	bootLogger.succ('Meisskey initialized');
}

/**
 * Init worker process
 */
async function workerMain(config: Config) {
	const workerType = process.env.WORKER_TYPE;
	const st = getWorkerStrategies(config);

	if (st.disableClustering) {
		if (st.onlyServer) {
			await require('./server').default();
		} else if (st.onlyQueue) {
			await require('./queue').default();
		} else {
			await require('./server').default();
			await require('./queue').default();
		}
	} else {
		if (workerType === 'server') {
			await require('./server').default();
		} else if (workerType === 'queue') {
			await require('./queue').default();
		} else {
			await require('./server').default();
			await require('./queue').default();
		}
	}

	if (cluster.isWorker) {
		// Send a 'ready' message to parent process
		if (process.send) {
			process.send('ready');
		}
	}

	setInterval(() => {
		clusterLogger.info(`memoryUsage(${workerType}:${process.pid}): ${JSON.stringify(process.memoryUsage())}`);
	}, 60 * 60 * 1000);

	setInterval(() => {
		const restartMin =
			workerType === 'server' ? config.workerStrategies?.serverWorkerRestartMin :
			workerType === 'queue' ? config.workerStrategies?.queueWorkerRestartMin :
			config.workerStrategies?.workerWorkerRestartMin;

		if (restartMin && restartMin > 0) {
			const uptimeMin = process.uptime() / 60;

			if (uptimeMin > restartMin) {
				clusterLogger.info(`${workerType} ${process.pid}: uptime limit exceeded ${uptimeMin.toFixed(2)} > ${restartMin}, exiting.`);
				process.exit(0);
			}
		}
	}, 60 * 1000);
}

const runningNodejsVersion = process.version.slice(1).split('.').map(x => parseInt(x, 10));

function showEnvironment(): void {
	const env = process.env.NODE_ENV;
	const logger = bootLogger.createSubLogger('env');
	logger.info(typeof env == 'undefined' ? 'NODE_ENV is not set' : `NODE_ENV: ${env}`);

	if (env !== 'production') {
		logger.warn('The environment is not in production mode.');
		logger.warn('DO NOT USE FOR PRODUCTION PURPOSE!', undefined, true);
	}
}

/**
 * Init app
 */
async function init(config: Config) {
	showEnvironment();

	const nodejsLogger = bootLogger.createSubLogger('nodejs');

	nodejsLogger.info(`Version ${runningNodejsVersion.join('.')}`);

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
	let disableClustering = false;

	if (config.workerStrategies) {
		workers = config.workerStrategies.workerWorkerCount || 0;
		servers = config.workerStrategies.serverWorkerCount || 0;
		queues = config.workerStrategies.queueWorkerCount || 0;
	}

	if (workers + servers + queues === 0) disableClustering = true;
	if (envOption.disableClustering) disableClustering = true;

	const onlyServer = envOption.onlyServer;
	const onlyQueue = envOption.onlyQueue;

	return {
		workers, servers, queues, disableClustering, onlyServer, onlyQueue
	};
}

function spawnWorker(type: 'server' | 'queue' | 'worker' = 'worker'): Promise<cluster.Worker> {
	return new Promise((res, rej) => {
		const worker = cluster.fork({ WORKER_TYPE: type });
		worker.on('message', message => {

			if (message === 'listenFailed') {
				bootLogger.error(`The server Listen failed due to the previous error.`);
				process.exit(1);
			}

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
if (!envOption.quiet) {
	process.on('unhandledRejection', console.dir);
}

// Display detail of uncaught exception
process.on('uncaughtException', err => {
	try {
		console.error(err);
	} catch { }
});

// Dying away...
process.on('exit', code => {
	logger.info(`The process is going to exit with code ${code}`);
});

//#endregion

main();
