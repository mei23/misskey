<template>
<div class="notifications" v-hotkey.global="keymap">
	<button :data-active="isOpen" @click="toggle" :title="$t('title')">
		<i class="bell"><fa :icon="['far', 'bell']"/></i>
		<i class="circle" v-if="hasUnreadNotification"><fa icon="circle"/></i>
	</button>
	<div class="pop" :class="navbar" v-if="isOpen">
		<div class="read-all" v-if="hasUnreadNotification">
			<button @click="readAllNotifications">{{ $t('mark-all-as-read') }}</button>
		</div>
		<mk-notifications/>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import contains from '../../../common/scripts/contains';

export default Vue.extend({
	i18n: i18n('desktop/views/components/ui.header.notifications.vue'),
	data() {
		return {
			isOpen: false
		};
	},

	computed: {
		navbar(): string {
			return this.$store.state.device.navbar;
		},

		hasUnreadNotification(): boolean {
			return this.$store.getters.isSignedIn && this.$store.state.i.hasUnreadNotification;
		},

		keymap(): any {
			return {
				'shift+n': this.toggle
			};
		}
	},

	methods: {
		toggle() {
			this.isOpen ? this.close() : this.open();
		},

		open() {
			this.isOpen = true;
			for (const el of Array.from(document.querySelectorAll('body *'))) {
				el.addEventListener('mousedown', this.onMousedown);
			}
		},

		close() {
			this.isOpen = false;
			for (const el of Array.from(document.querySelectorAll('body *'))) {
				el.removeEventListener('mousedown', this.onMousedown);
			}
		},

		readAllNotifications() {
			this.$root.api('notifications/mark_all_as_read');
		},

		onMousedown(e) {
			e.preventDefault();
			if (!contains(this.$el, e.target) && this.$el != e.target) this.close();
			return false;
		}
	}
});
</script>

<style lang="stylus" scoped>
.notifications
	> button
		display block
		margin 0
		padding 0
		width 32px
		color var(--desktopHeaderFg)
		border none
		background transparent
		cursor pointer

		*
			pointer-events none

		&:hover
		&[data-active='true']
			color var(--desktopHeaderHoverFg)

		> i.bell
			font-size 1.2em
			line-height 48px

		> i.circle
			margin-left -5px
			vertical-align super
			font-size 10px
			color var(--notificationIndicator)
			animation blink 1s infinite

	> .pop
		$bgcolor = var(--secondary)

		&.top
			top 56px

			&:before
				top -28px
				border-bottom solid 14px rgba(#000, 0.1)

			&:after
				top -27px
				border-bottom solid 14px $bgcolor

		&.bottom
			bottom 56px

			&:before
				bottom -28px
				border-top solid 14px rgba(#000, 0.1)

			&:after
				bottom -27px
				border-top solid 14px $bgcolor

		display block
		position absolute
		right -72px
		width 300px
		background $bgcolor
		border-radius 4px
		box-shadow 0 1px 4px rgba(#000, 0.25)

		.read-all
			display flex
			justify-content center
			align-items center
			padding 12px
			color var(--text)
			border-bottom solid var(--lineWidth) var(--faceDivider)

		&:before
			content ""
			pointer-events none
			display block
			position absolute
			right 74px
			border-top solid 14px transparent
			border-right solid 14px transparent
			border-bottom solid 14px transparent
			border-left solid 14px transparent

		&:after
			content ""
			pointer-events none
			display block
			position absolute
			right 74px
			border-top solid 14px transparent
			border-right solid 14px transparent
			border-bottom solid 14px transparent
			border-left solid 14px transparent

		> .mk-notifications
			max-height 350px
			font-size 1rem
			overflow auto

</style>
