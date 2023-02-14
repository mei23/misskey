<template>
<div>
	<ui-card>
		<template #title>{{ $t('instancemoderation') }}</template>

		<section>
			<header>{{ $t('ignoredInstances') }}</header>
			<ui-textarea v-model="blockedInstances"></ui-textarea>
			<ui-info>{{ $t('ignoredInstances-info') }}</ui-info>
		</section>

		<section>
			<header>{{ $t('selfSilencedInstances') }}</header>
			<ui-textarea v-model="selfSilencedInstances"></ui-textarea>
			<ui-info>{{ $t('selfSilencedInstances-info') }}</ui-info>
		</section>

		<section>
			<ui-switch v-model="exposeHome">{{ $t('exposeHome') }}</ui-switch>
			<ui-info>{{ $t('exposeHome-info') }}</ui-info>
		</section>

		<section>
			<ui-button @click="save">{{ $t('@._settings.save') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../i18n';

export default defineComponent({
	i18n: i18n('admin/views/instanceblocks.vue'),
	data() {
		return {
			$root: getCurrentInstance() as any,
			blockedInstances: '',
			selfSilencedInstances: '',
			exposeHome: false,
		};
	},
	created() {
		this.fetch();
	},
	methods: {
		fetch() {
			this.$root.api('admin/meta').then((meta: any) => {
				this.blockedInstances = meta.blockedInstances.join('\n');
				this.selfSilencedInstances = meta.selfSilencedInstances.join('\n');
				this.exposeHome = meta.exposeHome;
			});
		},
		save() {
			this.$root.api('admin/update-meta', {
				blockedInstances: this.blockedInstances ? this.blockedInstances.split('\n') : [],
				selfSilencedInstances: this.selfSilencedInstances ? this.selfSilencedInstances.split('\n') : [],
				exposeHome: !!this.exposeHome,
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
