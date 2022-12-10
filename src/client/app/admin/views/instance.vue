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
</div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import i18n from '../../i18n';
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
});
</script>
