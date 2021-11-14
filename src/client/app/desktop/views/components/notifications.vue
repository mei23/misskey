<template>
<div class="mk-notifications">
	<div class="placeholder" v-if="fetching">
		<template v-for="i in 10">
			<mk-note-skeleton :key="i"/>
		</template>
	</div>

	<div class="notifications" v-if="notifications.length != 0">
		<!-- トランジションを有効にするとなぜかメモリリークする -->
		<component :is="!$store.state.device.reduceMotion ? 'transition-group' : 'div'" name="mk-notifications" class="transition" tag="div">
			<template v-for="(notification, i) in _notifications">
				<div v-if="notification" class="notification" :class="notification.type" :key="notification.id">

					<template v-if="notification.type == 'reaction'">
						<mk-avatar class="avatar" :user="notification.user"/>
						<div class="text">
							<header>
								<mk-reaction-icon :reaction="notification.reaction" :custom-emojis="notification.note.emojis" class="icon"/>
								<router-link :to="notification.user | userPage" v-user-preview="notification.user.id" class="name">
									<mk-user-name :user="notification.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<router-link class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
								<fa icon="quote-left"/>
									<mfm :text="getNoteSummary(notification.note)" :plain="true" :nowrap="true" :custom-emojis="notification.note.emojis"/>
								<fa icon="quote-right"/>
							</router-link>
						</div>
					</template>

					<template v-if="notification.type == 'renote' && notification.note">
						<mk-avatar class="avatar" :user="notification.note.user"/>
						<div class="text">
							<header>
								<fa icon="retweet" class="icon"/>
								<router-link :to="notification.note.user | userPage" v-user-preview="notification.note.userId" class="name">
									<mk-user-name :user="notification.note.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<router-link v-if="notification.note.renote" class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note.renote)">
								<fa icon="quote-left" class="icon"/>
									<mfm :text="getNoteSummary(notification.note.renote)" :plain="true" :nowrap="true" :custom-emojis="notification.note.renote.emojis"/>
								<fa icon="quote-right"/>
							</router-link>
						</div>
					</template>

					<template v-if="notification.type == 'quote'">
						<mk-avatar class="avatar" :user="notification.note.user"/>
						<div class="text">
							<header>
								<fa icon="quote-left" class="icon"/>
								<router-link :to="notification.note.user | userPage" v-user-preview="notification.note.userId" class="name">
									<mk-user-name :user="notification.note.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<router-link class="note-preview" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
								<mfm :text="getNoteSummary(notification.note)" :plain="true" :custom-emojis="notification.note.emojis"/>
							</router-link>
						</div>
					</template>

					<template v-if="notification.type == 'follow'">
						<mk-avatar class="avatar" :user="notification.user"/>
						<div class="text">
							<header>
								<fa icon="user-plus" class="icon"/>
								<router-link :to="notification.user | userPage" v-user-preview="notification.user.id" class="name">
									<mk-user-name :user="notification.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
						</div>
					</template>

					<template v-if="notification.type == 'receiveFollowRequest'">
						<mk-avatar class="avatar" :user="notification.user"/>
						<div class="text">
							<header>
								<fa icon="user-clock" class="icon"/>
								<router-link :to="notification.user | userPage" v-user-preview="notification.user.id" class="name">
									<mk-user-name :user="notification.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<a @click="followRequests">{{ $t('@.follow-requests') }}</a>
						</div>
					</template>

					<template v-if="notification.type == 'reply'">
						<mk-avatar class="avatar" :user="notification.note.user"/>
						<div class="text">
							<header>
								<fa icon="reply" class="icon"/>
								<router-link :to="notification.note.user | userPage" v-user-preview="notification.note.userId" class="name">
									<mk-user-name :user="notification.note.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<router-link class="note-preview" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
								<mfm :text="getNoteSummary(notification.note)" :plain="true" :custom-emojis="notification.note.emojis"/>
							</router-link>
						</div>
					</template>

					<template v-if="notification.type == 'mention'">
						<mk-avatar class="avatar" :user="notification.note.user"/>
						<div class="text">
							<header>
								<fa icon="at" class="icon"/>
								<router-link :to="notification.note.user | userPage" v-user-preview="notification.note.userId" class="name">
									<mk-user-name :user="notification.note.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<a class="note-preview" :href="notification.note | notePage" :title="getNoteSummary(notification.note)">
								<mfm :text="getNoteSummary(notification.note)" :plain="true" :custom-emojis="notification.note.emojis"/>
							</a>
						</div>
					</template>

					<template v-if="notification.type == 'poll_vote'">
						<mk-avatar class="avatar" :user="notification.user"/>
						<div class="text">
							<header>
								<fa icon="chart-pie" class="icon"/>
								<a :href="notification.user | userPage" v-user-preview="notification.user.id" class="name">
									<mk-user-name :user="notification.user"/>
								</a>
								<mk-time :time="notification.createdAt"/>
							</header>
							<router-link class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
								<fa icon="quote-left"/>
									<mfm :text="getNoteSummary(notification.note)" :plain="true" :nowrap="true" :custom-emojis="notification.note.emojis"/>
								<fa icon="quote-right"/>
							</router-link>
						</div>
					</template>

					<template v-if="notification.type == 'poll_finished'">
						<mk-avatar class="avatar" :user="notification.user"/>
						<div class="text">
							<header>
								<fa icon="chart-pie" class="icon"/>
								<span>{{ $t('@.poll_finished') }}</span>
								<mk-time :time="notification.createdAt"/>
							</header>
							<router-link class="note-ref" :to="notification.note | notePage" :title="getNoteSummary(notification.note)">
								<fa icon="quote-left"/>
									<mfm :text="getNoteSummary(notification.note)" :plain="true" :nowrap="true" :custom-emojis="notification.note.emojis"/>
								<fa icon="quote-right"/>
							</router-link>
						</div>
					</template>

					<template v-if="notification.type == 'highlight'">
						<mk-avatar class="avatar" :user="notification.note.user"/>
						<div class="text">
							<header>
								<fa :icon="faLightbulb" class="icon"/>
								<router-link :to="notification.note.user | userPage" v-user-preview="notification.note.userId" class="name">
									<mk-user-name :user="notification.note.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<a class="note-preview" :href="notification.note | notePage" :title="getNoteSummary(notification.note)">
								<mfm :text="getNoteSummary(notification.note)" :plain="true" :custom-emojis="notification.note.emojis"/>
							</a>
						</div>
					</template>

					<template v-if="notification.type == 'unreadMessagingMessage'">
						<mk-avatar class="avatar" :user="notification.user"/>
						<div class="text">
							<header>
								<fa :icon="['far', 'comment']" class="icon"/>
								<router-link :to="notification.user | userPage" v-user-preview="notification.user.id" class="name">
									<mk-user-name :user="notification.user"/>
								</router-link>
								<mk-time :time="notification.createdAt"/>
							</header>
							<a class="note-preview" @click="toChat(notification.user)">
								<mfm :text="notification.message.text" :plain="true" :custom-emojis="notification.message.emojis"/>
							</a>
						</div>
					</template>
				</div>

				<p class="date" v-if="i != notifications.length - 1 && notification && _notifications[i + 1] && notification._date != _notifications[i + 1]._date" :key="notification.id + '-time'">
					<span><fa icon="angle-up"/>{{ notification._datetext }}</span>
					<span><fa icon="angle-down"/>{{ _notifications[i + 1]._datetext }}</span>
				</p>
			</template>
		</component>
	</div>
	<button class="more" :class="{ fetching: fetchingMoreNotifications }" v-if="moreNotifications" @click="fetchMoreNotifications" :disabled="fetchingMoreNotifications">
		<template v-if="fetchingMoreNotifications"><fa icon="spinner" pulse fixed-width/></template>{{ fetchingMoreNotifications ? $t('@.loading') : $t('@.load-more') }}
	</button>
	<p class="empty" v-if="notifications.length == 0 && !fetching">{{ $t('@.empty') }}</p>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import getNoteSummary from '../../../../../misc/get-note-summary';
import * as config from '../../../config';
import MkFollowRequestsWindow from './received-follow-requests-window.vue';
import { faLightbulb } from '@fortawesome/free-regular-svg-icons';

export default Vue.extend({
	i18n: i18n(),

	props: {
		type: {
			type: String,
			required: false
		}
	},

	data() {
		return {
			fetching: false,
			fetchingMoreNotifications: false,
			notifications: [],
			moreNotifications: false,
			connection: null,
			getNoteSummary,
			faLightbulb,
		};
	},

	computed: {
		_notifications(): any[] {
			return (this.notifications as any).map(notification => {
				if (notification == null) return null;
				const date = new Date(notification.createdAt).getDate();
				const month = new Date(notification.createdAt).getMonth() + 1;
				notification._date = date;
				notification._datetext = this.$t('@.month-and-day').replace('{month}', month.toString()).replace('{day}', date.toString());
				return notification;
			});
		}
	},

	watch: {
		type() {
			this.reload();
		}
	},

	mounted() {
		this.connection = this.$root.stream.useSharedConnection('main');

		this.connection.on('notification', this.onNotification);

		this.reload();
	},

	beforeDestroy() {
		this.connection.dispose();
	},

	methods: {
		reload() {
			this.fetching = true;

			const max = 10;

			this.$root.api('i/notifications', {
				includeTypes: this.type ? [this.type] : undefined,
				limit: max + 1
			}).then(notifications => {
				if (notifications.length == max + 1) {
					this.moreNotifications = true;
					notifications.pop();
				}

				this.notifications = notifications;
				this.fetching = false;
			});
		},

		fetchMoreNotifications() {
			this.fetchingMoreNotifications = true;

			const max = 30;

			const last = this.notifications.filter(x => x).pop();

			this.$root.api('i/notifications', {
				includeTypes: this.type ? [this.type] : undefined,
				limit: max + 1,
				untilId: last.id
			}).then(notifications => {
				if (notifications.length == max + 1) {
					this.moreNotifications = true;
					notifications.pop();
				} else {
					this.moreNotifications = false;
				}
				this.notifications = this.notifications.concat(notifications);
				this.fetchingMoreNotifications = false;
			});
		},

		onNotification(notification) {
			// TODO: ユーザーが画面を見てないと思われるとき(ブラウザやタブがアクティブじゃないなど)は送信しない
			this.$root.stream.send('readNotification', {
				id: notification.id
			});

			this.notifications.unshift(notification);

			// タブが非表示ならタイトルで通知
			if (document.hidden) {
				this.$store.commit('pushBehindNotification', notification);
			}

			// サウンドを再生する
			if (this.$store.state.device.enableSounds && this.$store.state.device.enableSoundsInNotifications) {
				const sound = new Audio(`${config.url}/assets/piko.mp3`);
				sound.volume = this.$store.state.device.soundVolume;
				sound.play();
			}
		},

		followRequests() {
			this.$root.new(MkFollowRequestsWindow);
		},

		toChat(user: any) {
			import('./messaging-room-window.vue').then(m => this.$root.new(m.default, { user }));
		},
	}
});
</script>

<style lang="stylus" scoped>
.mk-notifications
	.transition
		.mk-notifications-enter
		.mk-notifications-leave-to
			opacity 0
			transform translateY(-30px)

		> *
			transition transform .3s ease, opacity .3s ease

	> .placeholder
		padding 16px
		opacity 0.3

	> .notifications
		> div
			> .notification
				margin 0
				padding 16px
				overflow-wrap break-word
				font-size 12px
				border-bottom solid var(--lineWidth) var(--faceDivider)

				&:last-child
					border-bottom none

				&:after
					content ""
					display block
					clear both

				> .avatar
					display block
					float left
					position -webkit-sticky
					position sticky
					top 16px
					width 36px
					height 36px
					border-radius 6px

				> .text
					float right
					width calc(100% - 36px)
					padding-left 8px

					> header
						display flex
						align-items baseline
						white-space nowrap

						> .icon
							margin-right 4px

						> .name
							overflow hidden
							text-overflow ellipsis

						> .mk-time
							margin-left auto
							color var(--noteHeaderInfo)
							font-size 0.9em

				.note-preview
					color var(--noteText)
					display inline-block
					word-break break-word

				.note-ref
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
					.text header
						align-items normal

				&.renote, &.quote
					.text header [data-icon]
						color #77B255

				&.follow
					.text header [data-icon]
						color #53c7ce

				&.receiveFollowRequest
					.text header [data-icon]
						color #888

				&.reply, &.mention, &.highlight, &.unreadMessagingMessage
					.text header [data-icon]
						color #555

				&.poll_vote, &.poll_finished
					.text header
						color var(--text)
						align-items center

				&.poll_finished
					.avatar
						display none

					.text
						float none
						width auto
						padding 0

				&._missing_
					display none

			> .date
				display block
				margin 0
				line-height 32px
				text-align center
				font-size 0.8em
				color var(--dateDividerFg)
				background var(--dateDividerBg)

				span
					margin 0 16px

				[data-icon]
					margin-right 8px

	> .more
		display block
		width 100%
		padding 16px
		color var(--text)

		&:hover
			background rgba(#000, 0.025)

		&:active
			background rgba(#000, 0.05)

		&.fetching
			cursor wait

		> [data-icon]
			margin-right 4px

	> .empty
		margin 0
		padding 16px
		text-align center
		color var(--text)

</style>
