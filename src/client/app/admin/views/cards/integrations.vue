<!-- 管理画面/インスタンス/integrations-->
<template>
<ui-card>
	<template #title><fa :icon="faArrowsAltH"/> {{ $t('external-service-integration-config') }}</template>
	<template v-if="fetched">
		<section>
			<ui-switch v-model="enableTwitterIntegration">{{ $t('enable-twitter-integration') }}</ui-switch>
			<ui-horizon-group>
				<ui-input v-model="twitterConsumerKey" :disabled="!enableTwitterIntegration"><template #icon><fa icon="key"/></template>{{ $t('twitter-integration-consumer-key') }}</ui-input>
				<ui-input v-model="twitterConsumerSecret" :disabled="!enableTwitterIntegration"><template #icon><fa icon="key"/></template>{{ $t('twitter-integration-consumer-secret') }}</ui-input>
			</ui-horizon-group>
			<ui-info>{{ $t('twitter-integration-info', { url: `${url}/api/tw/cb` }) }}</ui-info>
		</section>
		<section>
			<ui-switch v-model="enableGithubIntegration">{{ $t('enable-github-integration') }}</ui-switch>
			<ui-horizon-group>
				<ui-input v-model="githubClientId" :disabled="!enableGithubIntegration"><template #icon><fa icon="key"/></template>{{ $t('github-integration-client-id') }}</ui-input>
				<ui-input v-model="githubClientSecret" :disabled="!enableGithubIntegration"><template #icon><fa icon="key"/></template>{{ $t('github-integration-client-secret') }}</ui-input>
			</ui-horizon-group>
			<ui-info>{{ $t('github-integration-info', { url: `${url}/api/gh/cb` }) }}</ui-info>
		</section>
		<section>
			<ui-switch v-model="enableDiscordIntegration">{{ $t('enable-discord-integration') }}</ui-switch>
			<ui-horizon-group>
				<ui-input v-model="discordClientId" :disabled="!enableDiscordIntegration"><template #icon><fa icon="key"/></template>{{ $t('discord-integration-client-id') }}</ui-input>
				<ui-input v-model="discordClientSecret" :disabled="!enableDiscordIntegration"><template #icon><fa icon="key"/></template>{{ $t('discord-integration-client-secret') }}</ui-input>
			</ui-horizon-group>
			<ui-info>{{ $t('discord-integration-info', { url: `${url}/api/dc/cb` }) }}</ui-info>
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
import { url } from '../../../config';

// アイコンを追加したらここをいじる 1/2
import { faArrowsAltH } from '@fortawesome/free-solid-svg-icons';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			url,

			// props 項目を追加したらここをいじる 1/3
			enableTwitterIntegration: false,
			twitterConsumerKey: null,
			twitterConsumerSecret: null,
			enableGithubIntegration: false,
			githubClientId: null,
			githubClientSecret: null,
			enableDiscordIntegration: false,
			discordClientId: null,
			discordClientSecret: null,

			// icons アイコンを追加したらここをいじる 2/2
			faArrowsAltH,
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
				this.enableTwitterIntegration = meta.enableTwitterIntegration;
				this.twitterConsumerKey = meta.twitterConsumerKey;
				this.twitterConsumerSecret = meta.twitterConsumerSecret;
				this.enableGithubIntegration = meta.enableGithubIntegration;
				this.githubClientId = meta.githubClientId;
				this.githubClientSecret = meta.githubClientSecret;
				this.enableDiscordIntegration = meta.enableDiscordIntegration;
				this.discordClientId = meta.discordClientId;
				this.discordClientSecret = meta.discordClientSecret;
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
