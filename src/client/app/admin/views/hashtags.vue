<template>
<div>
	<ui-card>
		<template #title>{{ $t('hided-tags') }}</template>
		<section class="fit-top">
			<ui-textarea v-model="hidedTags">
			</ui-textarea>
			<ui-button @click="save">{{ $t('@._settings.save') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../i18n';


export default defineComponent({
	i18n: i18n('admin/views/hashtags.vue'),
	data() {
		return {
			$root: getCurrentInstance() as any,
			hidedTags: '',
		};
	},
	created() {
		this.fetch();
	},
	methods: {
		fetch() {
			this.$root.api('admin/meta').then((meta: any) => {
				this.hidedTags = meta.hidedTags.join('\n');
			});
		},
		save() {
			this.$root.api('admin/update-meta', {
				hidedTags: this.hidedTags ? this.hidedTags.split('\n') : [],
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
				this.fetch();
			}).catch(e => {
				console.error('e', e);
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},
	}
});
</script>
<style lang="stylus" scoped>
</style>
