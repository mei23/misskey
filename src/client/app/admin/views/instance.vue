<template>
<div>
	<x-general/>
	<x-notetl/>
	<x-drive/>
	<x-captcha/>
	<x-ghost/>
	<x-email/>

	<ui-card>



		<section>
			<header><fa :icon="faBolt"/> {{ $t('serviceworker-config') }}</header>
			<ui-switch v-model="enableServiceWorker">{{ $t('enable-serviceworker') }}<template #desc>{{ $t('serviceworker-info') }}</template></ui-switch>
			<ui-info>{{ $t('vapid-info') }}<br><code>npx web-push generate-vapid-keys<br>OR<br>docker-compose run --rm web npx web-push generate-vapid-keys # Docker</code></ui-info>
			<ui-horizon-group inputs class="fit-bottom">
				<ui-input v-model="swPublicKey" :disabled="!enableServiceWorker"><template #icon><fa icon="key"/></template>{{ $t('vapid-publickey') }}</ui-input>
				<ui-input v-model="swPrivateKey" :disabled="!enableServiceWorker"><template #icon><fa icon="key"/></template>{{ $t('vapid-privatekey') }}</ui-input>
			</ui-horizon-group>
		</section>
		<section>
			<header>summaly Proxy</header>
			<ui-input v-model="summalyProxy">URL</ui-input>
		</section>
		<section>
			<ui-button @click="updateMeta">{{ $t('save') }}</ui-button>
		</section>
	</ui-card>

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

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	components: {
		XGeneral, XNotetl, XDrive, XCaptcha, XGhost, XEmail,
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
			summalyProxy: null,
			enableServiceWorker: false,
			swPublicKey: null,
			swPrivateKey: null,
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
			this.summalyProxy = meta.summalyProxy;
			this.enableServiceWorker = meta.enableServiceWorker;
			this.swPublicKey = meta.swPublickey;
			this.swPrivateKey = meta.swPrivateKey;

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
				summalyProxy: this.summalyProxy,

				enableServiceWorker: this.enableServiceWorker,
				swPublicKey: this.swPublicKey,
				swPrivateKey: this.swPrivateKey
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
