<template>
<header class="bvonvjxbwzaiskogyhbwgyxvcgserpmu">
	<mk-avatar class="avatar" :user="note.user" v-if="$store.state.device.postStyle == 'smart'"/>
	<router-link v-if="userUrl.startsWith('/')" class="name" :to="userUrl" v-user-preview="note.user.id"><mk-user-name :user="note.user"/></router-link>
	<a v-else class="name" :href="userUrl" v-user-preview="note.user.id"><mk-user-name :user="note.user"/></a>
	<span class="is-bot" v-if="note.user.isBot" :title="$t('@.bot-user')"><fa icon="robot"/></span>
	<span class="is-cat" v-if="note.user.isCat" :title="$t('@.cat-user')"><fa :icon="faPaw"/></span>
	<span class="username"><mk-acct :user="note.user"/></span>
	<span class="is-verified" v-if="note.user.isVerified" :title="$t('@.verified-user')"><fa icon="star"/></span>
	<div class="info" v-if="!noInfo">
		<span class="mobile" v-if="note.viaMobile"><fa icon="mobile-alt"/></span>
		<router-link v-if="noteUrl.startsWith('/')" class="created-at" :to="noteUrl"><mk-time :time="note.createdAt"/></router-link>
		<a v-else class="created-at" :href="noteUrl"><mk-time :time="note.createdAt"/></a>
		<x-visibility-icon class="visibility" :v="note.visibility" :localOnly="note.localOnly" :copyOnce="note.copyOnce"/>
		<span class="remote" title="Remote post" v-if="note.user.host != null"><fa :icon="faGlobeAmericas"/></span>
	</div>
</header>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { faGlobeAmericas, faPaw } from '@fortawesome/free-solid-svg-icons';
import XVisibilityIcon from '../../../common/views/components/visibility-icon.vue';
import getAcct from '../../../../../misc/acct/render';

export default Vue.extend({
	i18n: i18n(),
	components: {
		XVisibilityIcon,
	},
	data() {
		return {
			faGlobeAmericas, faPaw
		}
	},
	props: {
		note: {
			type: Object,
			required: true
		},
		noInfo: {
			type: Boolean,
			required: false,
			default: false
		},
		mini: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	computed: {
		userUrl(): string {
			return this.$store.getters.isSignedIn ? `/@${getAcct(this.note.user)}` : this.note.user.url || this.note.user.uri || `/@${getAcct(this.note.user)}`;
		},
		noteUrl(): string {
			return this.$store.getters.isSignedIn ? `/notes/${this.note.id}` : this.note.url || this.note.uri || `/notes/${this.note.id}`;
		},
	},
});
</script>

<style lang="stylus" scoped>
.bvonvjxbwzaiskogyhbwgyxvcgserpmu
	display flex
	align-items baseline
	white-space nowrap

	> .avatar
		flex-shrink 0
		margin-right 8px
		width 20px
		height 20px
		border-radius 100%

	> .name
		display block
		margin 0 .5em 0 0
		padding 0
		overflow hidden
		color var(--noteHeaderName)
		font-size 1em
		font-weight bold
		text-decoration none
		text-overflow ellipsis

		&:hover
			text-decoration underline

	> .username
		margin 0 .5em 0 0
		overflow hidden
		text-overflow ellipsis
		color var(--noteHeaderAcct)
		flex-shrink 2147483647

	> .is-bot
	> .is-cat
		margin 0 .5em 0 0
		color var(--noteHeaderBadgeFg)

	> .is-verified
		margin 0 .5em 0 0
		color #4dabf7

	> .info
		margin-left auto
		font-size 0.9em

		> *
			color var(--noteHeaderInfo)

		> .mobile
			margin-right 8px

		> .visibility
			margin-left 0.5em
			display inline-block

		> .remote
			margin-left 4px
			color #4dabf7

</style>
