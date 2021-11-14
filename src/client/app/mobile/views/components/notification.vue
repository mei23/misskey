<template>
<div class="mk-notification">
	<div class="notification reaction" v-if="notification.type == 'reaction'">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<mk-reaction-icon :reaction="notification.reaction" :custom-emojis="notification.note.emojis"/>
				<router-link class="name" :to="notification.user | userPage"><mk-user-name :user="notification.user"/></router-link>
				<mk-time :time="notification.createdAt"/>
			</header>
			<router-link class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
				<fa icon="quote-left"/>
					<mfm :text="getNoteSummary(notification.note)" :plain="true" :nowrap="true" :custom-emojis="notification.note.emojis"/>
				<fa icon="quote-right"/>
			</router-link>
		</div>
	</div>

	<div class="notification renote" v-if="notification.type == 'renote' && notification.note">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<fa icon="retweet"/>
				<router-link class="name" :to="notification.user | userPage"><mk-user-name :user="notification.user"/></router-link>
				<mk-time :time="notification.createdAt"/>
			</header>
			<router-link v-if="notification.note.renote" class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note.renote)">
				<fa icon="quote-left"/>
					<mfm :text="getNoteSummary(notification.note.renote)" :plain="true" :nowrap="true" :custom-emojis="notification.note.renote.emojis"/>
				<fa icon="quote-right"/>
			</router-link>
		</div>
	</div>

	<div class="notification follow" v-if="notification.type == 'follow'">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<fa icon="user-plus"/>
				<router-link class="name" :to="notification.user | userPage"><mk-user-name :user="notification.user"/></router-link>
				<mk-time :time="notification.createdAt"/>
			</header>
		</div>
	</div>

	<div class="notification followRequest" v-if="notification.type == 'receiveFollowRequest'">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<fa icon="user-clock"/>
				<router-link class="name" :to="notification.user | userPage"><mk-user-name :user="notification.user"/></router-link>
				<mk-time :time="notification.createdAt"/>
			</header>
			<a @click="followRequests">{{ $t('@.follow-requests') }}</a>
		</div>
	</div>

	<div class="notification pollVote" v-if="notification.type == 'poll_vote'">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<fa icon="chart-pie"/>
				<router-link class="name" :to="notification.user | userPage"><mk-user-name :user="notification.user"/></router-link>
				<mk-time :time="notification.createdAt"/>
			</header>
			<router-link class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
				<fa icon="quote-left"/>
					<mfm :text="getNoteSummary(notification.note)" :plain="true" :nowrap="true" :custom-emojis="notification.note.emojis"/>
				<fa icon="quote-right"/>
			</router-link>
		</div>
	</div>

	<div class="notification pollFinished" v-if="notification.type == 'poll_finished'">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<fa icon="chart-pie"/>
				<span>{{ $t('@.poll_finished') }}</span>
				<mk-time :time="notification.createdAt"/>
			</header>
			<router-link class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
				<fa icon="quote-left"/>
					<mfm :text="getNoteSummary(notification.note)" :plain="true" :nowrap="true" :custom-emojis="notification.note.emojis"/>
				<fa icon="quote-right"/>
			</router-link>
		</div>
	</div>

	<div class="notification highlight" v-if="notification.type == 'highlight'">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<fa :icon="faLightbulb"/>
				<router-link class="name" :to="notification.user | userPage">
					<mk-user-name :user="notification.user"/>
				</router-link>
				<mk-time :time="notification.createdAt"/>
			</header>
			<router-link class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
				<mfm :text="getNoteSummary(notification.note)" :plain="true" :custom-emojis="notification.note.emojis"/>
			</router-link>
		</div>
	</div>

	<template v-if="notification.type == 'quote'">
		<mk-note :note="notification.note"/>
	</template>

	<template v-if="notification.type == 'reply'">
		<mk-note :note="notification.note"/>
	</template>

	<template v-if="notification.type == 'mention'">
		<mk-note :note="notification.note"/>
	</template>

	<div class="notification unreadMessagingMessage" v-if="notification.type == 'unreadMessagingMessage'">
		<mk-avatar class="avatar" :user="notification.user"/>
		<div>
			<header>
				<fa icon="user-clock"/>
				<router-link class="name" :to="notification.user | userPage"><mk-user-name :user="notification.user"/></router-link>
				<mk-time :time="notification.createdAt"/>
			</header>
			<a class="note-ref" @click="toChat(notification.user)">
				<mfm :text="notification.message.text" :plain="true" :custom-emojis="notification.message.emojis"/>
			</a>
		</div>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import getNoteSummary from '../../../../../misc/get-note-summary';
import { faLightbulb } from '@fortawesome/free-regular-svg-icons';

export default Vue.extend({
	i18n: i18n(),
	props: ['notification'],
	data() {
		return {
			getNoteSummary,
			faLightbulb,
		};
	},

	methods: {
		followRequests() {
			this.$router.push('/i/received-follow-requests');
		},

		toChat(user: any) {
			this.$router.push(`/i/messaging/${user.username}`);
		},
	},
});
</script>

<style lang="stylus" scoped>
.mk-notification
	> .notification
		padding 16px
		font-size 12px
		overflow-wrap break-word
		border-bottom solid var(--lineWidth) var(--faceDivider)

		&:after
			content ""
			display block
			clear both

		> .avatar
			display block
			float left
			width 36px
			height 36px
			border-radius 6px

		> div
			float right
			width calc(100% - 36px)
			padding-left 8px

			> header
				display flex
				align-items baseline
				white-space nowrap

				[data-icon], .mk-reaction-icon
					margin-right 4px

				> .name
					text-overflow ellipsis
					white-space nowrap
					min-width 0
					overflow hidden

				> .mk-time
					margin-left auto
					color var(--noteHeaderInfo)
					font-size 0.9em

			> .note-preview
				color var(--noteText)

			> .note-ref
				color var(--noteText)
				display inline-block
				width: 100%
				overflow hidden
				white-space nowrap
				text-overflow ellipsis

				[data-icon]
					font-size 1em
					font-weight normal
					font-style normal
					display inline-block
					margin-right 3px

		&.reaction
			> div > header
				align-items normal

		&.renote
			> div > header [data-icon]
				color #77B255

		&.follow
			> div > header [data-icon]
				color #53c7ce

		&.receiveFollowRequest
			> div > header [data-icon]
				color #888

		&.reply, &.mention, &.highlight, &.unreadMessagingMessage
			> div > header [data-icon]
				color #555

		&.pollVote, &.pollFinished
			> div > header
				color var(--text)
				align-items center

		&.pollFinished
			> .avatar
				display none

			> div
				float none
				width auto
				padding 0
</style>
