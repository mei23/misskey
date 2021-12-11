<template>
<div class="wojmldye">
	<mk-note-detail class="note" v-for="n in user.pinnedNotes" :key="n.id" :note="n" :compact="true"/>
	<ui-container :body-togglable="true">
		<template #header><fa :icon="['far', 'comments']"/>{{ $t('recent-notes') }}</template>
		<div>
			<x-notes :user="user"/>
		</div>
	</ui-container>
	<ui-container :body-togglable="true">
		<template #header><fa icon="image"/>{{ $t('images') }}</template>
		<div>
			<x-photos :user="user"/>
		</div>
	</ui-container>
	<ui-container :body-togglable="true">
		<template #header><fa icon="chart-bar"/>{{ $t('activity') }}</template>
		<div style="padding:8px; color:black">
			<x-activity :user="user"/>
		</div>
	</ui-container>
	<x-reactions :user="user" style="margin-top: 16px; margin-bottom: 16px; "/>
	<mk-user-list :make-promise="makeFrequentlyRepliedUsersPromise" :icon-only="true"><fa icon="users"/> {{ $t('frequently-replied-users') }}</mk-user-list>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import XNotes from './home.notes.vue';
import XPhotos from './home.photos.vue';
import XReactions from '../../../../common/views/components/user-reactions.vue';

export default Vue.extend({
	i18n: i18n('mobile/views/pages/user/home.vue'),
	components: {
		XNotes,
		XPhotos,
		XReactions,
		XActivity: () => import('../../../../common/views/components/activity.vue').then(m => m.default)
	},
	props: ['user'],
	data() {
		return {
			makeFrequentlyRepliedUsersPromise: () => this.$root.api('users/get_frequently_replied_users', {
				userId: this.user.id
			}).then(res => res.map(x => x.user)),
		};
	}
});
</script>

<style lang="stylus" scoped>
.wojmldye
	> .note
		margin 0 0 8px 0

		@media (min-width 500px)
			margin 0 0 16px 0

</style>
