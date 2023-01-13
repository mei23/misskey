<template>
<div class="about814">
	<div class="about815" v-if="meta" :style="{ backgroundImage: meta.bannerUrl ? `url(${meta.bannerUrl})` : null }">
		<header>{{ meta.name }}</header>
		<div class="desc" v-if="meta.description" v-html="meta.description"></div>
	</div>

	<!-- 基本 -->
	<ui-container>
		<template #header><fa :icon="faServer"/> {{ $t('basic') }}</template>
		<div class="items" v-if="meta">
			<div class="item">
				<div class="key">Misskey</div>
				<div class="value">v{{ meta.version }}</div>
			</div>
			<div class="item" v-if="meta.maintainer && meta.maintainer.name">
				<div class="key">{{ $t('maintainerName') }}</div>
				<div class="value">{{ meta.maintainer.name}}</div>
			</div>
			<div class="item" v-if="meta.maintainer && meta.maintainer.email">
				<div class="key">{{ $t('maintainerEmail') }}</div>
				<div class="value">{{ meta.maintainer.email }}</div>
			</div>
		</div>
	</ui-container>

	<!-- 統計 -->
	<ui-container>
		<template #header><fa :icon="faChartBar"/> {{ $t('stats') }}</template>
		<div class="items">
			<div class="item" v-if="stats">
				<div class="key">{{ $t('users') }}</div>
				<div class="value">{{ stats.originalUsersCount }}</div>
			</div>
			<div class="item" v-if="stats">
				<div class="key">{{ $t('notes') }}</div>
				<div class="value">{{ stats.originalNotesCount }}</div>
			</div>
			<div class="item" v-if="stats">
				<div class="key">{{ $t('instances') }}</div>
				<div class="value">{{ stats.instances }}</div>
			</div>

			<div class="item" v-if="activeUsersCount">
				<div class="key">{{ $t('localActive') }}</div>
				<div class="value">{{ activeUsersCount.local }}</div>
			</div>
			<div class="item" v-if="activeUsersCount">
				<div class="key">{{ $t('globalActive') }}</div>
				<div class="value">{{ activeUsersCount.global }}</div>
			</div>
		</div>
	</ui-container>

	<ui-container>
		<template #header><fa :icon="faProjectDiagram"/> {{ $t('relays') }}</template>
		<div class="items" v-if="meta?.relays" >
			<div class="item" v-for="relay in meta.relays" :key="relay.host">
				<div class="key">
					<a :href="`https://${relay.host}`" rel="nofollow noopener" target="_blank">{{ relay.host }}</a>
				</div>
			</div>
		</div>
	</ui-container>

	<ui-container v-if="popularReactions">
		<template #header><fa :icon="faThumbsUp"/> {{ $t('popularReactions') }}</template>
		<div class="items">
			<div class="item" v-for="reaction in popularReactions.reactions" :key="reaction.reaction">
				<div class="key">
					<mk-reaction-icon :reaction="reaction.reaction" :customEmojis="popularReactions.emojis"/>
				</div>
				<div class="value">{{ reaction.count }}</div>
			</div>
		</div>
	</ui-container>

	<ui-container v-if="reacters">
		<template #header><fa :icon="['far', 'smile']"/> {{ $t('reacters') }}</template>
		<div class="items">
			<div class="item" v-for="(item, i) in reacters.global" :key="`r-${item.user.id}`">
				<div class="key" style="display: flex; gap: 0.5em; align-items: center;">
					<mk-avatar class="avatar" :user="item.user" :key="`ra-${item.user.id}`" style="width: 1.5em; height: 1.5em;"/>
					<mk-user-name :user="item.user" :key="`ru-${item.user.id}`"/>
				</div>
				<div class="value">{{ item.count }}</div>
			</div>
		</div>
	</ui-container>

</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../../i18n';
import { faServer, faChartBar, faThumbsUp, faProjectDiagram } from '@fortawesome/free-solid-svg-icons';

export default defineComponent({
	i18n: i18n('common/views/pages/about.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,
			meta: null as any,
			stats: null,
			reactions: null,
			popularReactions: null,
			activeUsersCount: null,
			reacters: null,
			faServer, faChartBar, faThumbsUp, faProjectDiagram,
		};
	},

	created() {
		this.$root.api('stats', {}, false, true).then((stats: any) => {
			this.stats = stats;
		});
		this.$root.getMeta().then((meta: any) => {
			this.meta = meta;
		});
		this.$root.api('notes/reactions/trend', {}, false, true).then((popularReactions: any) => {
			this.popularReactions = popularReactions;
		});
		this.$root.api('active-users-count', {}, false, true).then((activeUsersCount: any) => {
			this.activeUsersCount = activeUsersCount;
		});
		this.$root.api('notes/reactions/ranking', {}, false, true).then((reacters: any) => {
			this.reacters = reacters;
		});
	},

	mounted() {
		document.title = this.$root.instanceName;
	},
});
</script>

<style lang="stylus" scoped>
.about814
	> .about815
		overflow hidden
		background var(--face)
		color #fff
		text-shadow 0 0 8px #000
		border-radius 6px
		padding 16px
		margin-bottom 16px
		background-position 50%
		background-size cover

		> header
			font-size 20px
			font-weight bold

		> div
			font-size 14px
			opacity 0.8

	>>> .items
		color var(--text)

		> .item
			display flex
			padding 1em
			border-bottom solid 1px var(--faceDivider)

			&:last-child
				border-bottom none

			> .value
				margin-left auto
</style>
