<!-- Desktop user page の プロフィールより下の部分 -->
<template>
<div class="lnctpgve">
	<!-- ピン留め投稿 -->
	<mk-note-detail v-for="n in user.pinnedNotes" :key="n.id" :note="n" :compact="true"/>
	<!--<mk-calendar @chosen="warp" :start="new Date(user.createdAt)"/>-->
	<!-- Activityグラフ -->
	<div class="activity">
		<ui-container :body-togglable="true"
			:expanded="$store.state.device.expandUsersActivity"
			@toggle="expanded => $store.commit('device/set', { key: 'expandUsersActivity', value: expanded })">
			<template #header><fa icon="chart-bar"/>Activity</template>
			<x-activity :user="user" :limit="35" style="padding: 16px;"/>
		</ui-container>
	</div>
	<!-- リアクション -->
	<x-reactions :user="user"/>
	<!-- よく話すユーザー -->
	<mk-user-list :make-promise="makeFrequentlyRepliedUsersPromise" :icon-only="true"><fa icon="users"/> {{ $t('@.frequently-replied-users') }}</mk-user-list>
	<!-- フォト -->
	<x-photos :user="user"/>
	<!-- タイムライン -->
	<x-timeline ref="tl" :user="user"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import XTimeline from './user.timeline.vue';
import XPhotos from './user.photos.vue';
import XActivity from '../../../../common/views/components/activity.vue';
import XReactions from '../../../../common/views/components/user-reactions.vue';

export default Vue.extend({
	i18n: i18n(),
	components: {
		XTimeline,
		XPhotos,
		XActivity,
		XReactions,
	},
	props: {
		user: {
			type: Object,
			required: true
		}
	},
	data() {
		return {
			makeFrequentlyRepliedUsersPromise: () => this.$root.api('users/get_frequently_replied_users', {
				userId: this.user.id
			}).then(res => res.map(x => x.user)),
		};
	}
	methods: {
		warp(date) {
			(this.$refs.tl as any).warp(date);
		}
	}
});
</script>

<style lang="stylus" scoped>
.lnctpgve
	> *
		margin-bottom 16px

</style>
