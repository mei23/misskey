<template>
<div class="muteblockuser">
	<div class="avatar-link">
		<a :href="user | userPage(null, true)">
			<mk-avatar class="avatar" :user="user" :disable-link="true"/>
		</a>
	</div>
	<div class="text">
		<div><mk-user-name :user="user"/></div>
		<div class="username">@{{ user | acct }}</div>
		<div v-if="remaining"><i style="font-size: small; opacity: 0.7;">{{ remaining }}</i></div>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';

export default Vue.extend({
	i18n: i18n('common/views/components/mute-and-block.user.vue'),
	props: ['user', 'expiresAt'],

	computed: {
		remaining(): string | null{
			if (!this.expiresAt) return null;

			const sec = (new Date(this.expiresAt).getTime() - Date.now()) / 1000;

			return this.$t(
				sec >= 86400 ? '@.remaining.days' :
				sec >= 3600 ? '@.remaining.hours' :
				sec >= 60 ? '@.remaining.minutes' : '@.remaining.seconds')
				.replace('{s}', Math.floor(sec % 60))
				.replace('{m}', Math.floor(sec / 60) % 60)
				.replace('{h}', Math.floor(sec / 3600) % 24)
				.replace('{d}', Math.floor(sec / 86400));
		}
	},
});

</script>

<style lang="stylus" scoped>
.muteblockuser
	display flex
	padding 16px

	> .avatar-link
		> a
			> .avatar
				width 40px
				height 40px

	> .text
		color var(--text)
		margin-left 16px
</style>
