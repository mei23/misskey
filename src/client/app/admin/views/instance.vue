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
	<x-integrations/>

	<ui-card>
		<template #title>{{ $t('invite') }}</template>
		<section>
			<ui-button @click="invite">{{ $t('invite') }}</ui-button>
			<p v-if="inviteCode">Code: <code>{{ inviteCode }}</code></p>
		</section>
	</ui-card>


</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../i18n';
import { url, host } from '../../config';
import { toUnicode } from 'punycode/';
import XGeneral from './cards/general.vue';
import XNotetl from './cards/notetl.vue';
import XDrive from './cards/drive.vue';
import XCaptcha from './cards/captcha.vue';
import XGhost from './cards/ghost.vue';
import XEmail from './cards/email.vue';
import XSw from './cards/sw.vue';
import XSummaly from './cards/summaly.vue';
import XIntegrations from './cards/integrations.vue';

export default defineComponent({
	i18n: i18n('admin/views/instance.vue'),

	components: {
		XGeneral, XNotetl, XDrive, XCaptcha, XGhost, XEmail, XSw, XSummaly, XIntegrations,
	},

	data() {
		return {
			$root: getCurrentInstance() as any,

			fetched: false,
			url,
			host: toUnicode(host),



			inviteCode: null,

		};
	},

	created() {
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

	}
});
</script>
