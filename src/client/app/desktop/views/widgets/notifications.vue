<template>
<div class="mkw-notifications">
	<ui-container :show-header="!props.compact">
		<template #header><fa :icon="['far', 'bell']"/>{{ props.type === 'all' ? $t('title') : $t('@.notification-types.' + props.type) }}</template>
		<template #func><button :title="$t('@.notification-type')" @click="settings"><fa icon="cog"/></button></template>

		<mk-notifications :class="$style.notifications" :type="props.type === 'all' ? null : props.type"/>
	</ui-container>
</div>
</template>

<script lang="ts">
import define from '../../../common/define-widget';
import i18n from '../../../i18n';

export default define({
	name: 'notifications',
	props: () => ({
		type: 'all',
		compact: false
	})
}).extend({
	i18n: i18n('desktop/views/widgets/notifications.vue'),
	methods: {
		settings() {
			this.$root.dialog({
				title: this.$t('@.notification-type'),
				type: null,
				select: {
					items: ['all', 'follow', 'mention', 'reply', 'renote', 'quote', 'reaction', 'poll_vote', 'poll_finished',  'receiveFollowRequest', 'highlight'].map(x => ({
						value: x, text: this.$t('@.notification-types.' + x)
					}))
					default: this.props.type,
				},
				showCancelButton: true
			}).then(({ canceled, result: type }) => {
				if (canceled) return;
				this.props.type = type;
				this.save();
			});
		},
		func() {
			this.props.compact = !this.props.compact;
			this.save();
		}
	}
});
</script>

<style lang="stylus" module>
.notifications
	max-height 450px
	overflow auto

</style>
