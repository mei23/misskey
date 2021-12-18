<template>
<div>
	<!-- ピン留め投稿 -->
	<ui-container v-if="user.pinnedNotes && user.pinnedNotes.length > 0" :body-togglable="true">
		<template #header><fa icon="thumbtack"/> {{ $t('pinned-notes') }}</template>
		<div>
			<mk-note v-for="n in user.pinnedNotes" :key="n.id" :note="n"/>
		</div>
	</ui-container>
	<!-- Activityグラフ -->
	<ui-container :body-togglable="true"
		:expanded="$store.state.device.expandUsersActivity"
		@toggle="expanded => $store.commit('device/set', { key: 'expandUsersActivity', value: expanded })">
		<template #header><fa :icon="['far', 'chart-bar']"/> {{ $t('activity') }}</template>
		<div>
			<div ref="chart"></div>
		</div>
	</ui-container>
	<!-- リアクション -->
	<x-reactions :user="user" :key="user.id" :deck="true"/>
	<!-- よく話すユーザー -->
	<mk-user-list :make-promise="makeFrequentlyRepliedUsersPromise" :icon-only="true" :key="user.id"><fa icon="users"/> {{ $t('@.frequently-replied-users') }}</mk-user-list>
	<!-- フォト -->
	<ui-container v-if="images.length > 0" :body-togglable="true"
		:expanded="$store.state.device.expandUsersPhotos"
		@toggle="expanded => $store.commit('device/set', { key: 'expandUsersPhotos', value: expanded })">
		<template #header><fa :icon="['far', 'images']"/> {{ $t('images') }}</template>
		<div class="sainvnaq">
			<router-link v-for="image in images"
				:style="`background-image: url(${image.thumbnailUrl})`"
				:key="`${image.id}:${image._note.id}`"
				:to="image._note | notePage"
				:title="`${image.name}\n${(new Date(image.createdAt)).toLocaleString()}`"
			></router-link>
		</div>
	</ui-container>
	<!-- タイムライン -->
	<ui-container>
		<template #header><fa :icon="['far', 'comment-alt']"/> {{ $t('timeline') }}</template>
		<div>
			<div class="command">
				<ui-button @click="fetchOutbox()">{{ $t('fetch-posts') }}</ui-button>
			</div>
			<x-notes id="user_timeline_53" ref="timeline" :key="user.id" :make-promise="makePromise" @inited="() => $emit('loaded')"/>
		</div>
	</ui-container>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import XNotes from './deck.notes.vue';
import { concat } from '../../../../../prelude/array';
import ApexCharts from 'apexcharts';
import XReactions from '../../../common/views/components/user-reactions.vue';

const fetchLimit = 10;

export default Vue.extend({
	i18n: i18n('deck/deck.user-column.vue'),

	components: {
		XNotes,
		XReactions,
	},

	props: {
		user: {
			type: Object,
			required: true
		}
	},
	data() {
		return {
			withFiles: false,
			images: [],
			makePromise: null,
			makeFrequentlyRepliedUsersPromise: () => this.$root.api('users/get_frequently_replied_users', {
				userId: this.user.id,
				limit: 5,
			}).then(res => res.map(x => x.user)),
			chart: null as ApexCharts
		};
	},

	watch: {
		user() {
			this.fetch();
			this.genPromiseMaker();
		}
	},

	created() {
		this.fetch();
		this.genPromiseMaker();
	},

	methods: {
		genPromiseMaker() {
			this.makePromise = cursor => this.$root.api('users/notes', {
				userId: this.user.id,
				limit: fetchLimit + 1,
				untilId: cursor ? cursor : undefined,
				withFiles: this.withFiles,
				includeMyRenotes: this.$store.state.settings.showMyRenotes,
				includeRenotedMyNotes: this.$store.state.settings.showRenotedMyNotes,
				includeLocalRenotes: this.$store.state.settings.showLocalRenotes
			}).then(notes => {
				if (notes.length == fetchLimit + 1) {
					notes.pop();
					return {
						notes: notes,
						cursor: notes[notes.length - 1].id
					};
				} else {
					return {
						notes: notes,
						cursor: null
					};
				}
			});
		},

		fetchOutbox() {
			this.$root.api('ap/fetch-outbox', {
				userId: this.user.id,
				sync: true
			}).then(() => {
				(this.$refs.timeline as any).reload();
			});
		},

		fetch() {
			const image = ['image/jpeg','image/png','image/apng','image/gif','image/webp'];

			this.$root.api('users/notes', {
				userId: this.user.id,
				fileType: image,
				excludeNsfw: !this.$store.state.device.alwaysShowNsfw,
				limit: 9,
			}).then(notes => {
				for (const note of notes) {
					for (const file of note.files) {
						file._note = note;
					}
				}
				const files = concat(notes.map((n: any): any[] => n.files));
				this.images = files.filter(f => image.includes(f.type)).slice(0, 9);
			});

			this.$root.api('charts/user/notes', {
				userId: this.user.id,
				span: 'day',
				limit: 21
			}).then(stats => {
				const normal = [];
				const reply = [];
				const renote = [];

				const now = new Date();
				const y = now.getFullYear();
				const m = now.getMonth();
				const d = now.getDate();

				for (let i = 0; i < 21; i++) {
					const x = new Date(y, m, d - i);
					normal.push([
						x,
						stats.diffs.normal[i]
					]);
					reply.push([
						x,
						stats.diffs.reply[i]
					]);
					renote.push([
						x,
						stats.diffs.renote[i]
					]);
				}

				if (this.chart) this.chart.destroy();

				this.chart = new ApexCharts(this.$refs.chart, {
					chart: {
						type: 'bar',
						stacked: true,
						height: 100,
						sparkline: {
							enabled: true
						},
					},
					plotOptions: {
						bar: {
							columnWidth: '80%'
						}
					},
					grid: {
						clipMarkers: false,
						padding: {
							top: 16,
							right: 16,
							bottom: 16,
							left: 16
						}
					},
					tooltip: {
						shared: true,
						intersect: false
					},
					series: [{
						name: 'Normal',
						data: normal
					}, {
						name: 'Reply',
						data: reply
					}, {
						name: 'Renote',
						data: renote
					}],
					xaxis: {
						type: 'datetime',
						crosshairs: {
							width: 1,
							opacity: 1
						}
					}
				});

				this.chart.render();
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.sainvnaq
	display grid
	grid-template-columns 1fr 1fr 1fr
	gap 8px
	padding 16px

	> *
		height 70px
		background-position center center
		background-size cover
		background-clip content-box
		border-radius 4px

.command
	margin 8px 16px
</style>
