<!-- 管理画面/インスタンス/投稿とタイムライン -->
<template>
<ui-card>
	<template #title><fa :icon="faPencilAlt"/> {{ $t('note-and-tl') }}</template>
	<template v-if="fetched">
		<!-- note length -->
		<section class="fit-top fit-bottom">
			<ui-input v-model="maxNoteTextLength">{{ $t('max-note-text-length') }}</ui-input>
		</section>
		<!-- extra -->
		<section>
			<ui-switch v-model="disableLocalTimeline">{{ $t('disable-local-timeline') }}</ui-switch>
			<ui-switch v-model="disableGlobalTimeline">{{ $t('disable-global-timeline') }}</ui-switch>
			<ui-switch v-model="showReplayInPublicTimeline">{{ $t('showReplayInPublicTimeline') }}</ui-switch>
			<ui-switch v-model="disableTimelinePreview">{{ $t('disableTimelinePreview') }}</ui-switch>
			<ui-switch v-model="disableProfileDirectory">{{ $t('disableProfileDirectory') }}</ui-switch>
		</section>
		<!-- save -->
		<section>
			<ui-button @click="updateMeta">{{ $t('save') }}</ui-button>
		</section>
	</template>
	<template v-else>
		<div class="spinner"><fa icon="spinner" pulse fixed-width/></div>
	</template>
</ui-card>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../../i18n';

// アイコンを追加したらここをいじる 1/2
import { faPencilAlt } from '@fortawesome/free-solid-svg-icons';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			// props 項目を追加したらここをいじる 1/3
			maxNoteTextLength: '',
			disableLocalTimeline: false,
			disableGlobalTimeline: false,
			showReplayInPublicTimeline: false,
			disableTimelinePreview: false,
			disableProfileDirectory: false,

			// icons アイコンを追加したらここをいじる 2/2
			faPencilAlt
		};
	},

	created() {
		this.fetchMeta()
	},

	methods: {
		fetchMeta() {
			this.$root.api('admin/meta').then((meta: any) => {
				this.fetched = true;

				// props 項目を追加したらここをいじる 2/3
				this.maxNoteTextLength = meta.maxNoteTextLength;
				this.disableLocalTimeline = meta.disableLocalTimeline;
				this.disableGlobalTimeline = meta.disableGlobalTimeline;
				this.showReplayInPublicTimeline = meta.showReplayInPublicTimeline;
				this.disableTimelinePreview = meta.disableTimelinePreview;
				this.disableProfileDirectory = meta.disableProfileDirectory;
			});
		},

		updateMeta() {
			if (!this.fetched) {
				this.$root.dialog({
					type: 'error',
					text: 'Cannot continue because meta fetch has failed'
				});
				return;
			}

			this.$root.api('admin/update-meta', {
				// 項目を追加したらここをいじる 3/3
				maxNoteTextLength: parseInt(this.maxNoteTextLength, 10),
				disableLocalTimeline: this.disableLocalTimeline,
				disableGlobalTimeline: this.disableGlobalTimeline,
				showReplayInPublicTimeline: this.showReplayInPublicTimeline,
				disableTimelinePreview: this.disableTimelinePreview,
				disableProfileDirectory: this.disableProfileDirectory,
			}).then(() => {
				this.fetchMeta();
				this.$root.dialog({
					type: 'success',
					text: this.$t('saved')
				});
			}).catch((e: Error) => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		}
	}
});
</script>
<style lang="stylus" scoped>
.spinner
	font-size 2em
	height 3em
	display flex
	justify-content center
	align-items center
</style>
