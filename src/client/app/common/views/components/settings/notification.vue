<template>
<ui-card>
	<template #title><fa :icon="['far', 'bell']"/> {{ $t('title') }}</template>
	<section>
		<header>{{ $t('pushNotifications') }}</header>
		<ui-switch v-model="follow" @change="onChangePushNotifications">{{ $t('follow') }}</ui-switch>
		<ui-switch v-model="mention" @change="onChangePushNotifications">{{ $t('mention') }}</ui-switch>
		<ui-switch v-model="reply" @change="onChangePushNotifications">{{ $t('reply') }}</ui-switch>
		<ui-switch v-model="renote" @change="onChangePushNotifications">{{ $t('renote') }}</ui-switch>
		<ui-switch v-model="quote" @change="onChangePushNotifications">{{ $t('quote') }}</ui-switch>
		<ui-switch v-model="reaction" @change="onChangePushNotifications">{{ $t('reaction') }}</ui-switch>
		<ui-switch v-model="poll_vote" @change="onChangePushNotifications">{{ $t('poll_vote') }}</ui-switch>
		<ui-switch v-model="poll_finished" @change="onChangePushNotifications">{{ $t('poll_finished') }}</ui-switch>
		<ui-switch v-model="highlight" @change="onChangePushNotifications">{{ $t('highlight') }}</ui-switch>
	</section>
	<section>
		<ui-switch v-model="$store.state.i.settings.autoWatch" @change="onChangeAutoWatch">
			{{ $t('auto-watch') }}<template #desc>{{ $t('auto-watch-desc') }}</template>
		</ui-switch>
		<section>
			<ui-button @click="readAllNotifications">{{ $t('mark-as-read-all-notifications') }}</ui-button>
			<ui-button @click="readAllUnreadNotes">{{ $t('mark-as-read-all-unread-notes') }}</ui-button>
			<ui-button @click="readAllMessagingMessages">{{ $t('mark-as-read-all-talk-messages') }}</ui-button>
			<ui-button @click="unwatchAll">{{ $t('UnwatchAll') }}</ui-button>
		</section>
	</section>
</ui-card>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';

export default Vue.extend({
	i18n: i18n('common/views/components/notification-settings.vue'),

	data() {
		return {
			follow: true,
			mention: true,
			reply: true,
			renote: true,
			quote: true,
			reaction: true,
			poll_vote: true,
			poll_finished: true,
			highlight: true,
		};
	},

	created() {
		this.follow = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'follow');
		this.mention = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'mention');
		this.reply = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'reply');
		this.renote = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'renote');
		this.quote = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'quote');
		this.reaction = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'reaction');
		this.poll_vote = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'poll_vote');
		this.poll_finished = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'poll_finished');
		this.highlight = this.getPushNotificationsValue(this.$store.state.i.settings.pushNotifications, 'highlight');
	},

	methods: {
		onChangeAutoWatch(v) {
			this.$root.api('i/update', {
				autoWatch: v
			});
		},

		onChangePushNotifications() {
			this.$root.api('i/update', {
				pushNotifications: {
					follow: this.follow,
					mention: this.mention,
					reply: this.reply,
					renote: this.renote,
					quote: this.quote,
					reaction: this.reaction,
					poll_vote: this.poll_vote,
					poll_finished: this.poll_finished,
					highlight: this.highlight,
				}
			});
		},


		getPushNotificationsValue(pushNotifications: Record<string, boolean | undefined> | undefined, key: string) {
			console.log(`${key} => ${JSON.stringify(pushNotifications)}`);
			if (pushNotifications == null) return true;
			const value = pushNotifications[key];
			if (value == null) return true;
			return value;
		},

		readAllUnreadNotes() {
			this.$root.api('i/read_all_unread_notes');
		},

		readAllMessagingMessages() {
			this.$root.api('i/read_all_messaging_messages');
		},

		readAllNotifications() {
			this.$root.api('notifications/mark_all_as_read');
		},

		unwatchAll() {
			this.$root.api('notes/watching/delete-all');
		},
	}
});
</script>
