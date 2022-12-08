<!-- 管理画面/インスタンス/summaly-->
<template>
<ui-card>
	<template #title>summaly Proxy</template>
	<template v-if="fetched">
		<section class="fit-top fit-bottom">
			<ui-input v-model="summalyProxy">URL</ui-input>
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

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			// props 項目を追加したらここをいじる 1/3
			summalyProxy: null,

			// icons アイコンを追加したらここをいじる 2/2
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
				this.summalyProxy = meta.summalyProxy;
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
				summalyProxy: this.summalyProxy,
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
