<!-- 管理画面/インスタンス/email-->
<template>
<ui-card>
	<template #title><fa :icon="farEnvelope"/> {{ $t('email-config') }}</template>
	<template v-if="fetched">
		<section>
			<header></header>
			<ui-switch v-model="enableEmail">{{ $t('enable-email') }}<template #desc>{{ $t('email-config-info') }}</template></ui-switch>
			<ui-input v-model="email" type="email" :disabled="!enableEmail">{{ $t('email') }}</ui-input>
			<ui-horizon-group inputs>
				<ui-input v-model="smtpHost" :disabled="!enableEmail">{{ $t('smtp-host') }}</ui-input>
				<ui-input v-model="smtpPort" type="number" :disabled="!enableEmail">{{ $t('smtp-port') }}</ui-input>
			</ui-horizon-group>
			<ui-switch v-model="smtpAuth">{{ $t('smtp-auth') }}</ui-switch>
			<ui-horizon-group inputs>
				<ui-input v-model="smtpUser" :disabled="!enableEmail || !smtpAuth">{{ $t('smtp-user') }}</ui-input>
				<ui-input v-model="smtpPass" type="password" :withPasswordToggle="true" :disabled="!enableEmail || !smtpAuth">{{ $t('smtp-pass') }}</ui-input>
			</ui-horizon-group>
			<ui-switch v-model="smtpSecure" :disabled="!enableEmail">{{ $t('smtp-secure') }}<template #desc>{{ $t('smtp-secure-info') }}</template></ui-switch>
			<ui-button @click="testEmail()">{{ $t('test-mail') }}</ui-button>
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
import { faEnvelope as farEnvelope } from '@fortawesome/free-regular-svg-icons';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			// props 項目を追加したらここをいじる 1/3
			enableEmail: false,
			email: null,
			smtpSecure: false,
			smtpHost: null,
			smtpPort: '',
			smtpUser: null,
			smtpPass: null,
			smtpAuth: false,

			maintainerEmail: null,

			// icons アイコンを追加したらここをいじる 2/2
			farEnvelope,
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
				this.enableEmail = meta.enableEmail;
				this.email = meta.email;
				this.smtpSecure = meta.smtpSecure;
				this.smtpHost = meta.smtpHost;
				this.smtpPort = meta.smtpPort;
				this.smtpUser = meta.smtpUser;
				this.smtpPass = meta.smtpPass;
				this.smtpAuth = meta.smtpUser != null && meta.smtpUser !== '';

				this.maintainerEmail = meta.maintainer.email;
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
				enableEmail: this.enableEmail,
				email: this.email,
				smtpSecure: this.smtpSecure,
				smtpHost: this.smtpHost,
				smtpPort: parseInt(this.smtpPort, 10),
				smtpUser: this.smtpAuth ? this.smtpUser : '',
				smtpPass: this.smtpAuth ? this.smtpPass : '',
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
		},

		async testEmail() {
			this.$root.api('admin/send-email', {
				to: this.maintainerEmail,
				subject: 'Test email',
				text: 'Na'
			}).then((e: Error) => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}).catch((e: Error) => {
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
.spinner
	font-size 2em
	height 3em
	display flex
	justify-content center
	align-items center
</style>
