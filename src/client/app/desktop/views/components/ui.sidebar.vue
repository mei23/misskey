<template>
<div class="header" :class="navbar">
	<div class="body" style="display: flex; flex-direction: column;">
		<div class="nav" v-if="$store.getters.isSignedIn">
			<div class="post" >
				<button :title="$t('@.new-post')" @click="post"><fa icon="pencil-alt"/></button>
			</div>
			<div :title="$t('@.timeline')" class="home" :class="{ active: $route.name == 'index' }" @click="goToTop">
				<router-link to="/"><fa icon="home"/></router-link>
			</div>
			<div :title="$t('@.featured')" class="featured" :class="{ active: $route.name == 'featured' }">
				<router-link to="/featured"><fa :icon="faNewspaper"/></router-link>
			</div>
			<div :title="$t('@.explore')" class="explore" :class="{ active: $route.name == 'explore' || $route.name == 'explore-tag' }">
				<router-link to="/explore"><fa :icon="faUsers"/></router-link>
			</div>
			<div :title="$t('@.game')" class="game">
				<a @click="game"><fa icon="gamepad"/><template v-if="hasGameInvitations"><fa icon="circle"/></template></a>
			</div>
			<div :title="$t('@.pages')" class="pages">
				<router-link to="/i/pages"><fa :icon="faStickyNote"/></router-link>
			</div>
			<div :title="$t('@.room')" class="room">
				<router-link :to="`/@${ $store.state.i.username }/room`"><fa :icon="faDoorOpen"/></router-link>
			</div>
		</div>

		<div class="nav bottom" style="margin-top: auto" v-if="$store.getters.isSignedIn">
			<div :title="$t('@.search')">
				<a @click="search"><fa icon="search"/></a>
			</div>
			<div :title="$t('@.drive')">
				<a @click="drive"><fa icon="cloud"/></a>
			</div>
			<div :title="$t('@.notifications')" ref="notificationsButton" :class="{ active: showNotifications }">
				<a @click="notifications"><fa :icon="['far', 'bell']"/></a>
			</div>
			<div :title="$t('@.messaging')" class="messaging">
				<a @click="messaging"><fa icon="comments"/><template v-if="hasUnreadMessagingMessage"><fa icon="circle"/></template></a>
			</div>
			<div :title="$t('@.settings')">
				<a @click="settings"><fa icon="cog"/></a>
			</div>
			<div :title="$t('@.favorites')">
				<router-link to="/i/favorites"><fa icon="star"/></router-link>
			</div>
			<div :title="$t('@.noteReactions')">
				<router-link to="/i/reactions"><fa :icon="faThumbsUp"/></router-link>
			</div>
			<div :title="$t('@.follow-requests')">
				<a @click="followRequests"><fa :icon="['far', 'envelope']"/><i v-if="$store.state.i.pendingReceivedFollowRequestsCount">{{ $store.state.i.pendingReceivedFollowRequestsCount }}</i></a>
			</div>
			<div :title="$t($store.state.device.inDeckMode ? '@.home' : '@.deck')">
				<template v-if="$store.state.device.inDeckMode">
					<a @click="toggleDeckMode(false)"><fa icon="home"/></a>
				</template>
				<template v-else>
					<a @click="toggleDeckMode(true)"><fa icon="columns"/></a>
				</template>
			</div>
			<div :title="$t($store.state.device.darkmode ? '@.turn-off-darkmode' : '@.turn-on-darkmode')">
				<a @click="dark"><template v-if="$store.state.device.darkmode"><fa icon="moon"/></template><template v-else><fa :icon="['far', 'moon']"/></template></a>
			</div>
		</div>
	</div>

	<transition :name="`slide-${navbar}`">
		<div class="notifications" v-if="showNotifications" ref="notifications" :class="navbar">
			<mk-notifications/>
		</div>
	</transition>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import MkUserListsWindow from './user-lists-window.vue';
import MkFollowRequestsWindow from './received-follow-requests-window.vue';
import MkDriveWindow from './drive-window.vue';
import MkMessagingWindow from './messaging-window.vue';
import MkGameWindow from './game-window.vue';
import contains from '../../../common/scripts/contains';
import { faNewspaper, faUsers, faStickyNote, faDoorOpen, faThumbsUp } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('desktop/views/components/ui.sidebar.vue'),
	data() {
		return {
			hasGameInvitations: false,
			connection: null,
			showNotifications: false,
			searching: false,
			faNewspaper, faUsers, faStickyNote, faDoorOpen, faThumbsUp
		};
	},

	computed: {
		hasUnreadMessagingMessage(): boolean {
			return this.$store.getters.isSignedIn && this.$store.state.i.hasUnreadMessagingMessage;
		},

		navbar(): string {
			return this.$store.state.device.navbar;
		},
	},

	mounted() {
		if (this.$store.getters.isSignedIn) {
			this.connection = this.$root.stream.useSharedConnection('main');

			this.connection.on('reversiInvited', this.onReversiInvited);
			this.connection.on('reversiNoInvites', this.onReversiNoInvites);
		}
	},

	beforeDestroy() {
		if (this.$store.getters.isSignedIn) {
			this.connection.dispose();
		}
	},

	methods: {
		toggleDeckMode(deck) {
			this.$store.commit('device/set', { key: 'deckMode', value: deck });
			location.replace('/');
		},

		onReversiInvited() {
			this.hasGameInvitations = true;
		},

		onReversiNoInvites() {
			this.hasGameInvitations = false;
		},

		messaging() {
			this.$root.new(MkMessagingWindow);
		},

		game() {
			this.$root.new(MkGameWindow);
		},

		post() {
			this.$post();
		},

		search() {
			if (this.searching) return;

			this.$root.dialog({
				title: this.$t('@.search'),
				input: true
			}).then(async ({ canceled, result: query }) => {
				if (canceled) return;

				const q = query.trim();
				if (q.startsWith('@')) {
					this.$router.push(`/${q}`);
				} else if (q.startsWith('#')) {
					this.$router.push(`/tags/${encodeURIComponent(q.substr(1))}`);
				} else if (q.startsWith('https://')) {
					this.searching = true;
					try {
						const res = await this.$root.api('ap/show', {
							uri: q
						});
						if (res.type == 'User') {
							this.$router.push(`/@${res.object.username}@${res.object.host}`);
						} else if (res.type == 'Note') {
							this.$router.push(`/notes/${res.object.id}`);
						}
					} catch (e) {
						// TODO
					}
					this.searching = false;
				} else {
					this.$router.push(`/search?q=${encodeURIComponent(q)}`);
				}
			});
		},

		drive() {
			this.$root.new(MkDriveWindow);
		},

		list() {
			this.$root.new(MkUserListsWindow);
		},

		followRequests() {
			this.$root.new(MkFollowRequestsWindow);
		},

		settings() {
			this.$router.push(`/i/settings`);
		},

		signout() {
			this.$root.signout();
		},

		notifications() {
			this.showNotifications ? this.closeNotifications() : this.openNotifications();
		},

		openNotifications() {
			this.showNotifications = true;
			for (const el of Array.from(document.querySelectorAll('body *'))) {
				el.addEventListener('mousedown', this.onMousedown);
			}
		},

		closeNotifications() {
			this.showNotifications = false;
			for (const el of Array.from(document.querySelectorAll('body *'))) {
				el.removeEventListener('mousedown', this.onMousedown);
			}
		},

		onMousedown(e) {
			e.preventDefault();
			if (
				!contains(this.$refs.notifications, e.target) &&
				this.$refs.notifications != e.target &&
				!contains(this.$refs.notificationsButton, e.target) &&
				this.$refs.notificationsButton != e.target
			) {
				this.closeNotifications();
			}
			return false;
		},

		dark() {
			this.$store.commit('device/set', {
				key: 'darkmode',
				value: !this.$store.state.device.darkmode
			});
		},

		goToTop() {
			window.scrollTo({
				top: 0,
				behavior: 'smooth'
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.header
	$width = 68px

	position fixed
	top 0
	z-index 1000
	width $width
	height 100%

	&.left
		left 0
		box-shadow 4px 0 4px rgba(0, 0, 0, 0.1)

	&.right
		right 0
		box-shadow -4px 0 4px rgba(0, 0, 0, 0.1)

	> .body
		position fixed
		top 0
		z-index 1
		width $width
		height 100%
		background var(--desktopHeaderBg)

		> .nav.bottom
			> .account
				width $width
				height $width
				padding 14px

				> *
					display block
					width 100%
					height 100%

					> .avatar
						pointer-events none
						width 100%
						height 100%

	> .notifications
		position fixed
		top 0
		width 350px
		height 100%
		overflow auto
		background var(--secondary) 

		&.left
			left $width
			box-shadow 4px 0 4px rgba(0, 0, 0, 0.1)

		&.right
			right $width
			box-shadow -4px 0 4px rgba(0, 0, 0, 0.1)

	.nav
		> *
			> *
				display block
				width $width
				line-height 52px
				text-align center
				font-size 18px
				color var(--desktopHeaderFg)

				@media (max-height 800px)
					line-height 32px

				&:hover
					background rgba(0, 0, 0, 0.05)
					color var(--desktopHeaderHoverFg)
					text-decoration none

				&:active
					background rgba(0, 0, 0, 0.1)

		.post
			width $width
			height $width
			padding 12px

			> button
				display flex
				justify-content center
				align-items center
				height 100%
				width 100%
				color var(--primaryForeground)
				background var(--primary) !important
				border-radius 100%
				cursor pointer

				*
					pointer-events none

				&:hover
					background var(--primaryLighten10) !important

				&:active
					background var(--primaryDarken10) !important

	&.left
		.nav
			> *
				&.active
					box-shadow -4px 0 var(--primary) inset

	&.right
		.nav
			> *
				&.active
					box-shadow 4px 0 var(--primary) inset

.slide-left-enter-active,
.slide-left-leave-active {
	transition: all 0.2s ease;
}

.slide-left-enter, .slide-left-leave-to {
	transform: translateX(-16px);
	opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
	transition: all 0.2s ease;
}

.slide-right-enter, .slide-right-leave-to {
	transform: translateX(16px);
	opacity: 0;
}
</style>
