<template>
<div>
	<ui-card>
		<template #title>{{ $t('instanceblocks') }}</template>
		<section class="fit-top">
			<ui-textarea v-model="blockedInstances"></ui-textarea>
			<ui-info>{{ $t('blockedInstances-info') }}</ui-info>
			<ui-button @click="save">{{ $t('@._settings.save') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../i18n';

export default Vue.extend({
	i18n: i18n('admin/views/instanceblocks.vue'),
	data() {
		return {
			blockedInstances: '',
		};
	},
	created() {
		this.fetch();
	},
	methods: {
		fetch() {
			this.$root.api('admin/meta').then((meta: any) => {
				this.blockedInstances = meta.blockedInstances.join('\n');
			});
		},
		save() {
			this.$root.api('admin/update-meta', {
				blockedInstances: this.blockedInstances ? this.blockedInstances.split('\n') : [],
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
				this.fetch();
			}).catch((e: any) => {
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
