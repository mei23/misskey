<template>
<mk-ui>
	<template #header><span style="margin-right:4px;"><fa :icon="faNewspaper"/></span>{{ $t('@.featured-notes') }}</template>

	<main>
		<details>
			<summary>{{ $t('options') }}</summary>
			<ui-select v-model="days" :disabled="fetching">
				<template #label>{{ $t('days') }}</template>
				<option value="0.5">12 {{ $t('hour') }}</option>
				<option value="1">1 {{ $t('day') }}</option>
				<option value="2">2 {{ $t('day') }}</option>
				<option value="7">7 {{ $t('day') }}</option>
				<option value="30">30 {{ $t('day') }}</option>
			</ui-select>
			<ui-select v-model="filter" :disabled="fetching">
				<template #label>{{ $t('filter') }}</template>
				<option value="all">{{ $t('all') }}</option>
				<option value="excludeNsfw">{{ $t('excludeNsfw') }}</option>
				<option value="excludeSfw">{{ $t('excludeSfw') }}</option>
			</ui-select>
			<div>
				<ui-switch v-model="includeGlobal" :disabled="fetching">{{ $t('include-global') }}</ui-switch>
				<ui-switch v-model="mediaOnly" :disabled="fetching">{{ $t('media-only') }}</ui-switch>
			</div>
		</details>
		<div>
			<template v-for="note in notes">
				<mk-note class="post" :note="note" :key="note.id" :class="{ round: $store.state.device.roundedCorners }"/>
			</template>
		</div>
	</main>
</mk-ui>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import Progress from '../../../common/scripts/loading';
import { faNewspaper } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('mobile/views/pages/featured.vue'),
	data() {
		return {
			includeGlobal: true,
			mediaOnly: false,
			filter: 'all',
			days: 2,
			fetching: true,
			notes: [],
			faNewspaper
		};
	},
	watch: { 
		includeGlobal() {
			this.fetch();
		},
		mediaOnly() {
			this.fetch();
		},
		filter() {
			this.fetch();
		},
		days() {
			this.fetch();
		},
	},
	created() {
		this.fetch();
	},
	mounted() {
		document.title = this.$root.instanceName;
	},
	methods: {
		fetch() {
			Progress.start();
			this.fetching = true;

			this.$root.api('notes/featured', {
				limit: 30,
				days: Number(this.days),
				includeGlobal: this.includeGlobal,
				fileType: this.mediaOnly ? ['image/jpeg', 'image/png', 'image/apng', 'image/gif', 'image/webp', 'image/avif', 'video/mp4', 'video/webm'] : undefined,
				excludeNsfw: this.filter === 'excludeNsfw',
				excludeSfw: this.filter === 'excludeSfw',
			}, false, false).then((notes: any) => {
				notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				this.notes = notes;
				this.fetching = false;

				Progress.done();
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
main
	> details
		margin 16px 8px
		color var(--text)
		cursor pointer

	> * > .post
		margin-bottom 8px
		background var(--face)
		border-bottom 0

		&.round
			border-radius 6px

	@media (min-width 500px)
		> * > .post
			margin-bottom 16px

</style>
