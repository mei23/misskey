<template>
<div>
	<x-general/>
	<x-notetl/>
	<x-drive/>
	<x-captcha/>
	<x-ghost/>
	<x-email/>
	<x-sw/>
	<x-summaly/>


	<ui-card>
		<template #title>{{ $t('invite') }}</template>
		<section>
			<ui-button @click="invite">{{ $t('invite') }}</ui-button>
			<p v-if="inviteCode">Code: <code>{{ inviteCode }}</code></p>
		</section>
	</ui-card>

	<ui-card>
		<template #title>{{ $t('twitter-integration-config') }}</template>
		<section>
			<ui-switch v-model="enableTwitterIntegration">{{ $t('enable-twitter-integration') }}</ui-switch>
			<ui-horizon-group>
				<ui-input v-model="twitterConsumerKey" :disabled="!enableTwitterIntegration"><template #icon><fa icon="key"/></template>{{ $t('twitter-integration-consumer-key') }}</ui-input>
				<ui-input v-model="twitterConsumerSecret" :disabled="!enableTwitterIntegration"><template #icon><fa icon="key"/></template>{{ $t('twitter-integration-consumer-secret') }}</ui-input>
			</ui-horizon-group>
			<ui-info>{{ $t('twitter-integration-info', { url: `${url}/api/tw/cb` }) }}</ui-info>
			<ui-button @click="updateMeta">{{ $t('save') }}</ui-button>
		</section>
	</ui-card>

	<ui-card>
		<template #title>{{ $t('github-integration-config') }}</template>
		<section>
			<ui-switch v-model="enableGithubIntegration">{{ $t('enable-github-integration') }}</ui-switch>
			<ui-horizon-group>
				<ui-input v-model="githubClientId" :disabled="!enableGithubIntegration"><template #icon><fa icon="key"/></template>{{ $t('github-integration-client-id') }}</ui-input>
				<ui-input v-model="githubClientSecret" :disabled="!enableGithubIntegration"><template #icon><fa icon="key"/></template>{{ $t('github-integration-client-secret') }}</ui-input>
			</ui-horizon-group>
			<ui-info>{{ $t('github-integration-info', { url: `${url}/api/gh/cb` }) }}</ui-info>
			<ui-button @click="updateMeta">{{ $t('save') }}</ui-button>
		</section>
	</ui-card>

	<ui-card>
		<template #title>{{ $t('discord-integration-config') }}</template>
		<section>
			<ui-switch v-model="enableDiscordIntegration">{{ $t('enable-discord-integration') }}</ui-switch>
			<ui-horizon-group>
				<ui-input v-model="discordClientId" :disabled="!enableDiscordIntegration"><template #icon><fa icon="key"/></template>{{ $t('discord-integration-client-id') }}</ui-input>
				<ui-input v-model="discordClientSecret" :disabled="!enableDiscordIntegration"><template #icon><fa icon="key"/></template>{{ $t('discord-integration-client-secret') }}</ui-input>
			</ui-horizon-group>
			<ui-info>{{ $t('discord-integration-info', { url: `${url}/api/dc/cb` }) }}</ui-info>
			<ui-button @click="updateMeta">{{ $t('save') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../i18n';
import { url, host } from '../../config';
import { toUnicode } from 'punycode/';
import { faHeadset, faShieldAlt, faGhost, faUserPlus, faBolt } from '@fortawesome/free-solid-svg-icons';
import { faEnvelope as farEnvelope } from '@fortawesome/free-regular-svg-icons';
import XGeneral from './cards/general.vue';
import XNotetl from './cards/notetl.vue';
import XDrive from './cards/drive.vue';
import XCaptcha from './cards/captcha.vue';
import XGhost from './cards/ghost.vue';
import XEmail from './cards/email.vue';
import XSw from './cards/sw.vue';
import XSummaly from './cards/summaly.vue';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	components: {
		XGeneral, XNotetl, XDrive, XCaptcha, XGhost, XEmail, XSw, XSummaly,
	},

	data() {
		return {
			$root: getCurrentInstance() as any,

			fetched: false,
			url,
			host: toUnicode(host),


			enableTwitterIntegration: false,
			twitterConsumerKey: null,
			twitterConsumerSecret: null,
			enableGithubIntegration: false,
			githubClientId: null,
			githubClientSecret: null,
			enableDiscordIntegration: false,
			discordClientId: null,
			discordClientSecret: null,
			inviteCode: null,

			faHeadset, faShieldAlt, faGhost, faUserPlus, farEnvelope, faBolt
		};
	},

	created() {
		this.$root.api('admin/meta').then((meta: any) => {


			this.enableTwitterIntegration = meta.enableTwitterIntegration;
			this.twitterConsumerKey = meta.twitterConsumerKey;
			this.twitterConsumerSecret = meta.twitterConsumerSecret;
			this.enableGithubIntegration = meta.enableGithubIntegration;
			this.githubClientId = meta.githubClientId;
			this.githubClientSecret = meta.githubClientSecret;
			this.enableDiscordIntegration = meta.enableDiscordIntegration;
			this.discordClientId = meta.discordClientId;
			this.discordClientSecret = meta.discordClientSecret;


			this.fetched = true;
		}).catch(e => {
			this.$root.dialog({
				type: 'error',
				text: 'meta fetch failed'
			});
		});
	},

	methods: {
		invite() {
			this.$root.api('admin/invite').then(x => {
				this.inviteCode = x.code;
			}).catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
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


				enableTwitterIntegration: this.enableTwitterIntegration,
				twitterConsumerKey: this.twitterConsumerKey,
				twitterConsumerSecret: this.twitterConsumerSecret,
				enableGithubIntegration: this.enableGithubIntegration,
				githubClientId: this.githubClientId,
				githubClientSecret: this.githubClientSecret,
				enableDiscordIntegration: this.enableDiscordIntegration,
				discordClientId: this.discordClientId,
				discordClientSecret: this.discordClientSecret,


			}).then(() => {
				this.$root.dialog({
					type: 'success',
					text: this.$t('saved')
				});
			}).catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		}
	}
});
</script>
