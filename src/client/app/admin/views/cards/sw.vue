<!-- 管理画面/インスタンス/sw-->
<template>
<ui-card>
	<template #title><fa :icon="faBolt"/> {{ $t('serviceworker-config') }}</template>
	<template v-if="fetched">
		<section>
			<ui-switch v-model="enableServiceWorker">{{ $t('enable-serviceworker') }}<template #desc>{{ $t('serviceworker-info') }}</template></ui-switch>
			<ui-info>{{ $t('vapid-info') }}<br><code>npx web-push generate-vapid-keys<br>OR<br>docker-compose run --rm web npx web-push generate-vapid-keys # Docker</code></ui-info>
			<ui-horizon-group inputs class="fit-bottom">
				<ui-input v-model="swPublicKey" :disabled="!enableServiceWorker"><template #icon><fa icon="key"/></template>{{ $t('vapid-publickey') }}</ui-input>
				<ui-input v-model="swPrivateKey" :disabled="!enableServiceWorker"><template #icon><fa icon="key"/></template>{{ $t('vapid-privatekey') }}</ui-input>
			</ui-horizon-group>
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
import { faBolt } from '@fortawesome/free-solid-svg-icons';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			// props 項目を追加したらここをいじる 1/3
			enableServiceWorker: false,
			swPublicKey: null,
			swPrivateKey: null,

			// icons アイコンを追加したらここをいじる 2/2
			faBolt,
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
				this.enableServiceWorker = meta.enableServiceWorker;
				this.swPublicKey = meta.swPublickey;
				this.swPrivateKey = meta.swPrivateKey;
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
				enableServiceWorker: this.enableServiceWorker,
				swPublicKey: this.swPublicKey,
				swPrivateKey: this.swPrivateKey
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
