<!-- 管理画面/インスタンス/ghost-->
<template>
<ui-card>
	<template #title><fa :icon="faGhost"/> {{ $t('proxy-account-config') }}</template>
	<template v-if="fetched">
		<section>
			<header></header>
			<ui-info>{{ $t('proxy-account-info') }}</ui-info>
			<ui-input v-model="proxyAccount"><template #prefix>@</template>{{ $t('proxy-account-username') }}<template #desc>{{ $t('proxy-account-username-desc') }}</template></ui-input>
			<ui-info warn>{{ $t('proxy-account-warn') }}</ui-info>
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
import { faGhost } from '@fortawesome/free-solid-svg-icons';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			// props 項目を追加したらここをいじる 1/3
			proxyAccount: null,

			// icons アイコンを追加したらここをいじる 2/2
			faGhost,
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
				this.proxyAccount = meta.proxyAccount;
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
				proxyAccount: this.proxyAccount,
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
