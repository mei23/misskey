<template>
<div>
	<ui-card>
		<template #title><fa :icon="faChartBar"/> {{ $t('title') }}</template>

		<!-- Deliver -->
		<section class="wptihjuy">
			<header><fa :icon="faPaperPlane"/> Deliver</header>
			<ui-horizon-group inputs v-if="latestStats" class="fit-bottom">
				<ui-input :value="latestStats.deliver.activeSincePrevTick" type="text" readonly>
					<span>Process</span>
					<template #prefix><fa :icon="fasPlayCircle"/></template>
					<template #suffix>jobs/tick</template>
				</ui-input>
				<ui-input :value="latestStats.deliver.active" type="text" readonly>
					<span>Active</span>
					<template #prefix><fa :icon="farPlayCircle"/></template>
					<template #suffix>{{ `/ ${latestStats.deliver.limit} jobs` }}</template>
				</ui-input>
				<ui-input :value="latestStats.deliver.waiting" type="text" readonly>
					<span>Waiting</span>
					<template #prefix><fa :icon="faStopCircle"/></template>
					<template #suffix>jobs</template>
				</ui-input>
				<ui-input :value="latestStats.deliver.delayed" type="text" readonly>
					<span>Delayed</span>
					<template #prefix><fa :icon="faStopwatch"/></template>
					<template #suffix>jobs</template>
				</ui-input>
			</ui-horizon-group>
			<div ref="deliverChart" class="chart"></div>
			<ui-horizon-group v-if="$store.getters.isAdminOrModerator" inputs class="fit-bottom">
				<ui-button @click="promoteJobs('deliver')">{{ $t('promoteJobs') }}</ui-button>
				<ui-button @click="removeJobs('deliver')">{{ $t('clearJobs') }}</ui-button>
			</ui-horizon-group >
		</section>

		<!-- Inbox -->
		<section class="wptihjuy">
			<header><fa :icon="faInbox"/> Inbox</header>
			<ui-horizon-group inputs v-if="latestStats" class="fit-bottom">
				<ui-input :value="latestStats.inbox.activeSincePrevTick" type="text" readonly>
					<span>Process</span>
					<template #prefix><fa :icon="fasPlayCircle"/></template>
					<template #suffix>jobs/tick</template>
				</ui-input>
				<ui-input :value="latestStats.inbox.active" type="text" readonly>
					<span>Active</span>
					<template #prefix><fa :icon="farPlayCircle"/></template>
					<template #suffix>{{ `/ ${latestStats.inbox.limit} jobs` }}</template>
				</ui-input>
				<ui-input :value="latestStats.inbox.waiting" type="text" readonly>
					<span>Waiting</span>
					<template #prefix><fa :icon="faStopCircle"/></template>
					<template #suffix>jobs</template>
				</ui-input>
				<ui-input :value="latestStats.inbox.delayed" type="text" readonly>
					<span>Delayed</span>
					<template #prefix><fa :icon="faStopwatch"/></template>
					<template #suffix>jobs</template>
				</ui-input>
			</ui-horizon-group>
			<div ref="inboxChart" class="chart"></div>
			<ui-horizon-group v-if="$store.getters.isAdminOrModerator" inputs class="fit-bottom">
				<ui-button @click="promoteJobs('inbox')">{{ $t('promoteJobs') }}</ui-button>
				<ui-button @click="removeJobs('inbox')">{{ $t('clearJobs') }}</ui-button>
			</ui-horizon-group >
		</section>

		<!-- InboxLazy -->
		<section class="wptihjuy">
			<header><fa :icon="faInbox"/> Inbox (Lazy)</header>
			<ui-horizon-group inputs v-if="latestStats" class="fit-bottom">
				<ui-input :value="latestStats.inboxLazy.activeSincePrevTick" type="text" readonly>
					<span>Process</span>
					<template #prefix><fa :icon="fasPlayCircle"/></template>
					<template #suffix>jobs/tick</template>
				</ui-input>
				<ui-input :value="latestStats.inboxLazy.active" type="text" readonly>
					<span>Active</span>
					<template #prefix><fa :icon="farPlayCircle"/></template>
					<template #suffix>{{ `/ ${latestStats.inboxLazy.limit} jobs` }}</template>
				</ui-input>
				<ui-input :value="latestStats.inboxLazy.waiting" type="text" readonly>
					<span>Waiting</span>
					<template #prefix><fa :icon="faStopCircle"/></template>
					<template #suffix>jobs</template>
				</ui-input>
				<ui-input :value="latestStats.inboxLazy.delayed" type="text" readonly>
					<span>Delayed</span>
					<template #prefix><fa :icon="faStopwatch"/></template>
					<template #suffix>jobs</template>
				</ui-input>
			</ui-horizon-group>
			<div ref="inboxLazyChart" class="chart"></div>
			<ui-horizon-group v-if="$store.getters.isAdminOrModerator" inputs class="fit-bottom">
				<ui-button @click="promoteJobs('inboxLazy')">{{ $t('promoteJobs') }}</ui-button>
				<ui-button @click="removeJobs('inboxLazy')">{{ $t('clearJobs') }}</ui-button>
			</ui-horizon-group >
		</section>
	</ui-card>

	<!-- job queue list -->
	<ui-card v-if="$store.getters.isAdminOrModerator">
		<template #title><fa :icon="faTasks"/> {{ $t('jobs') }}</template>
		<!-- selector -->
		<section class="fit-top">
			<ui-horizon-group inputs>
				<ui-select v-model="domain">
					<template #label>{{ $t('queue') }}</template>
					<option value="deliver">{{ $t('domains.deliver') }}</option>
					<option value="inbox">{{ $t('domains.inbox') }}</option>
					<option value="inboxLazy">{{ $t('domains.inboxLazy') }}</option>
					<option value="db">{{ $t('domains.db') }}</option>
				</ui-select>
				<ui-select v-model="state">
					<template #label>{{ $t('state') }}</template>
					<option value="delayed">{{ $t('states.delayed') }}</option>
					<option value="active">{{ $t('states.active') }}</option>
					<option value="waiting">{{ $t('states.waiting') }}</option>
				</ui-select>
				<ui-select v-model="jobsLimit">
					<template #label>{{ $t('limit') }}</template>
					<option value="1000">1000</option>
					<option value="3000">3000</option>
					<option value="5000">5000</option>
					<option value="10000">10000</option>
				</ui-select>
			</ui-horizon-group>
			<!-- jobs -->
			<details class="gsjs280" v-for="gsj in groupSortedJobs" :key="gsj.key">
				<summary>{{ `${gsj.key} (${gsj.len})` }}</summary>
				<details class="xvvuvgsv" v-for="job in gsj.jobs" :key="job.id" @click="() => { if (!job.logs) showLogs(job.id) }">
					<summary>
						<b>{{ job.id }}</b>
						<template v-if="domain === 'deliver'">
							<span>{{ job.data.to }}</span>
						</template>
						<template v-if="domain === 'inbox'">
							<span>{{ job.data.activity.id }}</span>
						</template>
						<template v-if="domain === 'inboxLazy'">
							<span>{{ job.data.activity.id }}</span>
						</template>
						<template v-if="domain === 'db'">
							<span>{{ job.name }}</span>
						</template>
						<span>{{ `(${job.attempts}/${job.maxAttempts}, age=${Math.floor((jobsFetched - job.timestamp) / 1000 / 60)}min${job.delay ? `, firstAttemptDelay=${Math.floor(job.delay / 1000 / 60)}min` : ''})` }}</span>
					</summary>
					<pre v-if="job.logs">{{ job.logs }}</pre>
					<pre v-if="job.logs">{{ JSON.stringify(job.data, null, 2) }}</pre>
				</details>
			</details>
			<ui-info v-if="jobs.length == jobsLimit">{{ $t('result-is-truncated', { n: jobsLimit }) }}</ui-info>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../i18n';
import ApexCharts from 'apexcharts';
import * as tinycolor from 'tinycolor2';
import { faTasks, faInbox, faStopwatch, faPlayCircle as fasPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { faPaperPlane, faStopCircle, faPlayCircle as farPlayCircle, faChartBar } from '@fortawesome/free-regular-svg-icons';
import { groupBy } from '../../../../prelude/array';

const limit = 200;

export default Vue.extend({
	i18n: i18n('admin/views/queue.vue'),

	data() {
		return {
			stats: [],
			deliverChart: null,
			inboxChart: null,
			inboxLazyChart: null,
			jobs: [],
			jobsLimit: 1000,
			jobsFetched: Date.now(),
			domain: 'deliver',
			state: 'delayed',
			faTasks, faPaperPlane, faInbox, faStopwatch, faStopCircle, farPlayCircle, fasPlayCircle, faChartBar
		};
	},

	computed: {
		latestStats(): any {
			return this.stats[this.stats.length - 1];
		},

		groupSortedJobs() {
			const grps = groupBy(this.jobs, (job: any) => {
				if (typeof job.name === 'string' && job.name.match(/^[0-9A-Za-z.-]+$/)) return job.name;
				try {
					if (job.attempts === 0) return '(throttled)'
					const t = job?.data?.to || job?.data?.signature?.keyId;
					if (t == null) return '(none)';
					const u = new URL(t);
					if (u.hostname.match(/^[0-9A-Za-z.-]+$/)) return u.hostname;
					return '(none)';
				} catch {
					return '(none)';
				}
			});

			const h = Object.keys(grps).map(key => ({ key: key, len: grps[key].length, jobs: grps[key] }));
			return h.sort((a, b) => b.len - a.len);
		},
	},

	watch: {
		stats(stats) {
			this.inboxChart.updateSeries([{
				name: 'Process',
				type: 'area',
				data: stats.map((x, i) => ({ x: i, y: x.inbox.activeSincePrevTick }))
			}, {
				name: 'Active',
				type: 'area',
				data: stats.map((x, i) => ({ x: i, y: x.inbox.active }))
			}, {
				name: 'Waiting',
				type: 'line',
				data: stats.map((x, i) => ({ x: i, y: x.inbox.waiting }))
			}, {
				name: 'Delayed',
				type: 'line',
				data: stats.map((x, i) => ({ x: i, y: x.inbox.delayed }))
			}]);
			this.inboxLazyChart.updateSeries([{
				name: 'Process',
				type: 'area',
				data: stats.map((x, i) => ({ x: i, y: x.inboxLazy.activeSincePrevTick }))
			}, {
				name: 'Active',
				type: 'area',
				data: stats.map((x, i) => ({ x: i, y: x.inboxLazy.active }))
			}, {
				name: 'Waiting',
				type: 'line',
				data: stats.map((x, i) => ({ x: i, y: x.inboxLazy.waiting }))
			}, {
				name: 'Delayed',
				type: 'line',
				data: stats.map((x, i) => ({ x: i, y: x.inboxLazy.delayed }))
			}]);
			this.deliverChart.updateSeries([{
				name: 'Process',
				type: 'area',
				data: stats.map((x, i) => ({ x: i, y: x.deliver.activeSincePrevTick }))
			}, {
				name: 'Active',
				type: 'area',
				data: stats.map((x, i) => ({ x: i, y: x.deliver.active }))
			}, {
				name: 'Waiting',
				type: 'line',
				data: stats.map((x, i) => ({ x: i, y: x.deliver.waiting }))
			}, {
				name: 'Delayed',
				type: 'line',
				data: stats.map((x, i) => ({ x: i, y: x.deliver.delayed }))
			}]);
		},

		domain() {
			this.jobs = [];
			this.fetchJobs();
		},

		state() {
			this.jobs = [];
			this.fetchJobs();
		},

		jobsLimit() {
			this.jobs = [];
			this.fetchJobs();
		},
	},

	mounted() {
		this.fetchJobs();

		const chartOpts = id => ({
			chart: {
				id,
				group: 'queue',
				type: 'area',
				height: 200,
				animations: {
					dynamicAnimation: {
						enabled: false
					}
				},
				toolbar: {
					show: false
				},
				zoom: {
					enabled: false
				}
			},
			dataLabels: {
				enabled: false
			},
			grid: {
				clipMarkers: false,
				borderColor: 'rgba(0, 0, 0, 0.1)',
				xaxis: {
					lines: {
						show: true,
					}
				},
			},
			stroke: {
				curve: 'straight',
				width: 2
			},
			tooltip: {
				enabled: false
			},
			legend: {
				labels: {
					colors: tinycolor(getComputedStyle(document.documentElement).getPropertyValue('--text')).toRgbString()
				},
			},
			series: [] as any,
			colors: ['#00E396', '#00BCD4', '#FFB300', '#e53935'],
			xaxis: {
				type: 'numeric',
				labels: {
					show: false
				},
				tooltip: {
					enabled: false
				}
			},
			yaxis: {
				show: false,
				min: 0,
			}
		});

		this.inboxChart = new ApexCharts(this.$refs.inboxChart, chartOpts('a'));
		this.inboxLazyChart = new ApexCharts(this.$refs.inboxLazyChart, chartOpts('a'));
		this.deliverChart = new ApexCharts(this.$refs.deliverChart, chartOpts('b'));

		this.inboxChart.render();
		this.inboxLazyChart.render();
		this.deliverChart.render();

		const connection = this.$root.stream.useSharedConnection('queueStats');
		connection.on('stats', this.onStats);
		connection.on('statsLog', this.onStatsLog);
		connection.send('requestLog', {
			id: Math.random().toString().substr(2, 8),
			length: limit
		});

		this.$once('hook:beforeDestroy', () => {
			connection.dispose();
			this.inboxChart.destroy();
			this.inboxLazyChart.destroy();
			this.deliverChart.destroy();
		});
	},

	methods: {
		async removeAllJobs() {
			const process = async () => {
				await this.$root.api('admin/queue/clear');
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});
		},

		async removeJobs(domain: string) {
			this.$root.api('admin/queue/clear', {
				domain
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}).catch((e: any) => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});
		},

		async promoteJobs(domain: string) {
			this.$root.api('admin/queue/promote', {
				domain
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}).catch((e: any) => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});
		},

		onStats(stats) {
			this.stats.push(stats);
			if (this.stats.length > limit) this.stats.shift();
		},

		onStatsLog(statsLog) {
			for (const stats of statsLog.reverse()) {
				this.onStats(stats);
			}
		},

		fetchJobs() {
			this.$root.api('admin/queue/jobs', {
				domain: this.domain,
				state: this.state,
				limit: Number(this.jobsLimit)
			}).then((jobs: any[]) => {
				this.jobsFetched = Date.now(),
				this.jobs = jobs;
			});
		},

		showLogs(jobId: string) {
			this.$root.api('admin/queue/job', {
				domain: this.domain,
				jobId
			}).then((job: any) => {
				this.jobs
					.filter((j: any) => j.id == jobId)
					.map((j: any) => Vue.set(j, 'logs', job.logs.length > 0 ? job.logs.join('\n') : '(no logs)'));
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.wptihjuy
	> .chart
		min-height 200px !important
		margin 0 -8px

details.gsjs280
	margin-left 0.3em
	margin-top 0.3em
	margin-bottom 0.3em
	> summary
		cursor pointer
	> details.xvvuvgsv
		margin-left 0.5em
		margin-top 0.3em
		margin-bottom 0.3em
		> summary
			cursor pointer
			>>> b, span
				margin 0 6px
		> pre
			margin 0.5em 1em
			white-space pre-wrap

</style>
