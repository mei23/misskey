<!-- 管理画面/インスタンス/captcha-->
<template>
<ui-card>
	<template #title><fa :icon="faShieldAlt"/> {{ $t('captcha-config') }}</template>
	<template v-if="fetched">
		<section class="fit-bottom">
			<ui-switch v-model="enableRecaptcha">{{ $t('enable-recaptcha') }}</ui-switch>
			<ui-info>{{ $t('recaptcha-info') }}</ui-info>
			<ui-horizon-group inputs>
				<ui-input v-model="recaptchaSiteKey" :disabled="!enableRecaptcha"><template #icon><fa icon="key"/></template>{{ $t('recaptcha-site-key') }}</ui-input>
				<ui-input v-model="recaptchaSecretKey" :disabled="!enableRecaptcha"><template #icon><fa icon="key"/></template>{{ $t('recaptcha-secret-key') }}</ui-input>
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
import { faShieldAlt } from '@fortawesome/free-solid-svg-icons';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			// props 項目を追加したらここをいじる 1/3
			enableRecaptcha: false,
			recaptchaSiteKey: null,
			recaptchaSecretKey: null,

			// icons アイコンを追加したらここをいじる 2/2
			faShieldAlt,
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
				this.enableRecaptcha = meta.enableRecaptcha;
				this.recaptchaSiteKey = meta.recaptchaSiteKey;
				this.recaptchaSecretKey = meta.recaptchaSecretKey;
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
				enableRecaptcha: this.enableRecaptcha,
				recaptchaSiteKey: this.recaptchaSiteKey,
				recaptchaSecretKey: this.recaptchaSecretKey,
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
