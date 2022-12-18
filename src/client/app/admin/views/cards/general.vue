<!-- 管理画面/インスタンス/一番上 -->
<template>
<ui-card>
	<template #title><fa icon="cog"/> {{ $t('instance') }}</template>
	<template v-if="fetched">
		<!-- instance -->
		<section class="fit-top fit-bottom">
			<ui-input v-model="name">{{ $t('instance-name') }}</ui-input>
			<ui-textarea v-model="description">{{ $t('instance-description') }}</ui-textarea>
			<ui-input v-model="mascotImageUrl"><template #icon><fa icon="link"/></template>{{ $t('logo-url') }}</ui-input>
			<ui-input v-model="bannerUrl"><template #icon><fa icon="link"/></template>{{ $t('banner-url') }}</ui-input>
			<ui-input v-model="languages"><template #icon><fa icon="language"/></template>{{ $t('languages') }}<template #desc>{{ $t('languages-desc') }}</template></ui-input>
		</section>
		<!-- maintainer -->
		<section class="fit-bottom">
			<header><fa :icon="faHeadset"/> {{ $t('maintainer-config') }}</header>
			<ui-horizon-group inputs>
				<ui-input v-model="maintainerName">{{ $t('maintainer-name') }}</ui-input>
				<ui-input v-model="maintainerEmail" type="email"><template #icon><fa :icon="farEnvelope"/></template>{{ $t('maintainer-email') }}</ui-input>
			</ui-horizon-group>
		</section>
		<!-- extra -->
		<section>
			<ui-switch v-model="disableRegistration">{{ $t('disable-registration') }}</ui-switch>
		</section>
		<section>
			<header>{{ $t('invite') }}</header>
			<ui-button @click="invite">{{ $t('invite') }}</ui-button>
			<p v-if="inviteCode">Code: <code>{{ inviteCode }}</code></p>
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
import { faHeadset } from '@fortawesome/free-solid-svg-icons';
import { faEnvelope as farEnvelope } from '@fortawesome/free-regular-svg-icons';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			// controls
			fetched: false,

			// props 項目を追加したらここをいじる 1/3
			name: null,
			description: null,
			mascotImageUrl: null,
			bannerUrl: null,
			languages: null,
			maintainerName: null,
			maintainerEmail: null,
			disableRegistration: false,

			inviteCode: null,

			// icons アイコンを追加したらここをいじる 2/2
			faHeadset, farEnvelope,
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
				this.name = meta.name;
				this.description = meta.description;
				this.mascotImageUrl = meta.mascotImageUrl;
				this.bannerUrl = meta.bannerUrl;
				this.languages = meta.langs.join(' ');
				this.maintainerName = meta.maintainer.name;
				this.maintainerEmail = meta.maintainer.email;
				this.disableRegistration = meta.disableRegistration;
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
				name: this.name,
				description: this.description,
				mascotImageUrl: this.mascotImageUrl,
				bannerUrl: this.bannerUrl,
				langs: this.languages ? this.languages.split(' ') : [],
				maintainerName: this.maintainerName,
				maintainerEmail: this.maintainerEmail,
				disableRegistration: this.disableRegistration,
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

		invite() {
			this.$root.api('admin/invite').then((x: any) => {
				this.inviteCode = x.code;
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
