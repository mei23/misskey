<template>
<div class="omechnps" v-if="!fetching && user">
	<div class="is-suspended" v-if="user.isSuspended">
		<fa icon="exclamation-triangle"/> {{ $t('@.user-suspended') }}
	</div>
	<div class="is-remote" v-if="user.host != null">
		<fa icon="exclamation-triangle"/> {{ $t('@.is-remote-user') }}<a :href="user.url || user.uri" rel="nofollow noopener" target="_blank">{{ $t('@.view-on-remote') }}</a>
	</div>
	<div class="no-federation" v-if="user.noFederation">
		<fa icon="exclamation-triangle"/> {{ $t('@.user-no-federation') }}
	</div>
	<div class="main">
		<x-header class="header" :user="user"/>
		<router-view :user="user"></router-view>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import parseAcct from '../../../../../../misc/acct/parse';
import Progress from '../../../../common/scripts/loading';
import XHeader from './user.header.vue';

export default Vue.extend({
	i18n: i18n(),
	components: {
		XHeader
	},
	data() {
		return {
			fetching: true,
			user: null
		};
	},
	watch: {
		$route: 'fetch'
	},
	created() {
		this.fetch();
	},
	methods: {
		fetch() {
			if (!this.$route.params.user) return;
			this.fetching = true;
			Progress.start();
			const { username, host } = parseAcct(this.$route.params.user);
			this.$root.api('users/show', { username, host: host ?? undefined }, false, !this.$store.getters.isSignedIn).then(user => {
				if (this.$store.state.i || !user.host) this.user = user;
				this.fetching = false;
				Progress.done();
			}).catch(() => {
				this.fetching = false;
				Progress.done();
			});
		},

		warp(date) {
			(this.$refs.tl as any).warp(date);
		}
	}
});
</script>

<style lang="stylus" scoped>
.omechnps
	width 100%
	margin 0 auto

	> .is-suspended
	> .is-remote
	> .no-federation
		margin-bottom 16px
		padding 14px 16px
		font-size 14px
		border-radius 6px
		box-shadow 0 3px 8px rgba(0, 0, 0, 0.2)

		&.is-suspended
			color var(--suspendedInfoFg)
			background var(--suspendedInfoBg)

		&.is-remote, &.no-federation
			color var(--remoteInfoFg)
			background var(--remoteInfoBg)

		> a
			font-weight bold

	> .main
		> .header
			margin-bottom 16px

</style>
