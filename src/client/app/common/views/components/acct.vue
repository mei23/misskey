<template>
<span class="mk-acct" v-once>
	<span class="name">@{{ user.username }}</span>
	<span class="host" v-if="user.host || detail || $store.state.settings.showFullAcct">@{{ user.host || host }}</span>
	<fa v-if="!simple && user.isLocked == true" class="locked" icon="lock" fixed-width/>
	<fa v-if="!simple && user.refuseFollow == true" class="refuseFollow" icon="ban" fixed-width/>
	<fa v-if="!simple && user.noFederation == true" class="no-federation" icon="heart" title="No federation" fixed-width/>
</span>
</template>

<script lang="ts">
import Vue from 'vue';
import { host } from '../../../config';
import { toUnicode } from 'punycode/';
export default Vue.extend({
	props: ['user', 'detail', 'simple'],
	data() {
		return {
			host: toUnicode(host)
		};
	}
});
</script>

<style lang="stylus" scoped>
.mk-acct
	opacity 0.5

	> .locked, .refuseFollow, .no-federation
		opacity 0.8
		margin-left 0.5em
</style>
