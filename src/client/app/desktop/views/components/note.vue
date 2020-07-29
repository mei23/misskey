<template>
<div
	class="note"
	:class="{
		mini: narrow,
	 }"
	v-show="appearNote.deletedAt == null && !hideThisNote"
	:tabindex="appearNote.deletedAt == null ? '-1' : null"
	v-hotkey="keymap"
	:title="title"
>
	<mk-renote class="renote" v-if="isRenote" :note="note"/>
	<x-sub v-for="note in conversation" :key="note.id" :note="note"/>
	<div
		class="reply-to"
		:class="{
			'visibility-home': appearNote.reply.visibility === 'home',
			'visibility-followers': appearNote.reply.visibility === 'followers',
			'visibility-specified': appearNote.reply.visibility === 'specified',
			'coloring-bg': $store.state.device.visibilityColoring === 'bg',
			'coloring-left': $store.state.device.visibilityColoring === 'left',
		}"
		v-if="appearNote.reply && (!$store.getters.isSignedIn || $store.state.settings.showReplyTarget) && !preview"
	>
		<x-sub :note="appearNote.reply"/>
	</div>
	<article
		class="article"
		:class="{
			'visibility-home': appearNote.visibility === 'home',
			'visibility-followers': appearNote.visibility === 'followers',
			'visibility-specified': appearNote.visibility === 'specified',
			'coloring-bg': $store.state.device.visibilityColoring === 'bg',
			'coloring-left': $store.state.device.visibilityColoring === 'left',
		}"
	>
		<mk-avatar class="avatar" :user="appearNote.user"/>
		<div class="main">
			<mk-note-header class="header" :note="appearNote" :mini="narrow" :no-info="detail"/>
			<x-instance-info v-if="appearNote.user.instance" :instance="appearNote.user.instance" />
			<div class="body" v-if="appearNote.deletedAt == null">
				<p v-if="appearNote.cw != null" class="cw">
					<mfm v-if="appearNote.cw != ''" class="text" :text="appearNote.cw" :author="appearNote.user" :i="$store.state.i" :custom-emojis="appearNote.emojis" />
					<mk-cw-button v-model="showContent" :note="appearNote"/>
				</p>
				<div class="content" v-show="appearNote.cw == null || showContent">
					<div class="text" :class="{ scroll : !detail }">
						<span v-if="appearNote.isHidden" style="opacity: 0.5">{{ $t('private') }}</span>
						<a class="reply" v-if="appearNote.reply"><fa icon="reply"/></a>
						<mfm v-if="appearNote.text" :text="appearNote.text" :author="appearNote.user" :i="$store.state.i" :custom-emojis="appearNote.emojis"
							:style="{ 'font-size': appearNote.text && appearNote.text.length > 500 ? '11px' : 'inherit' }"/>
						<a class="rp" v-if="appearNote.renote">RN:</a>
					</div>
					<div class="files" v-if="appearNote.files.length > 0">
						<mk-media-list :hide="!$store.state.device.alwaysShowNsfw && appearNote.cw == null" :media-list="appearNote.files"/>
					</div>
					<mk-poll v-if="appearNote.poll" :note="appearNote" ref="pollViewer"/>
					<a class="location" v-if="appearNote.geo" :href="`https://maps.google.com/maps?q=${appearNote.geo.coordinates[1]},${appearNote.geo.coordinates[0]}`" rel="noopener" target="_blank"><fa icon="map-marker-alt"/> 位置情報</a>
					<div class="renote" v-if="appearNote.renote"><mk-note-preview :note="appearNote.renote"/></div>
					<mk-url-preview v-for="url in urls" :url="url" :key="url" :mini="mini" :compact="compact" :detail="detail"/>
				</div>
			</div>
			<footer v-if="appearNote.deletedAt == null && !preview" class="footer">
				<router-link v-if="detail" class="time" :to="appearNote | notePage">
					<fa :icon="faClock"/>
					{{ }}
					<mk-time :time="appearNote.createdAt" mode="detail"/>
				</router-link>
				<div v-if="detail" class="visibility-info">
					<x-visibility-icon class="visibility" :v="appearNote.visibility" :localOnly="appearNote.localOnly" :copyOnce="appearNote.copyOnce" :withText="true"/>
				</div>
				<span class="app" v-if="appearNote.app && narrow && detail && $store.state.settings.showVia">via <b>{{ appearNote.app.name }}</b></span>
				<mk-reactions-viewer :note="appearNote" ref="reactionsViewer"/>
				<button class="replyButton button" @click="reply()" :title="$t('reply')">
					<template v-if="appearNote.reply"><fa icon="reply-all"/></template>
					<template v-else><fa icon="reply"/></template>
					<p class="count" v-if="appearNote.repliesCount > 0">{{ appearNote.repliesCount }}</p>
				</button>
				<button v-if="appearNote.myRenoteId != null" class="renoteButton button renoted" @click="undoRenote()" title="Undo">
					<fa icon="retweet"/>
					<p class="count" v-if="appearNote.renoteCount > 0">{{ appearNote.renoteCount }}</p>
				</button>
				<button v-else-if="['public', 'home'].includes(appearNote.visibility)" class="renoteButton button" @click="renote()" :title="$t('renote')">
					<fa icon="retweet"/>
					<p class="count" v-if="appearNote.renoteCount > 0">{{ appearNote.renoteCount }}</p>
				</button>
				<button v-else class="inhibitedButton button">
					<fa icon="ban"/>
				</button>
				<button v-if="appearNote.myReaction == null" class="reactionButton button" @click="react()" ref="reactButton" :title="$t('add-reaction')">
					<fa icon="plus"/>
					<p class="count" v-if="Object.values(appearNote.reactionCounts).some(x => x)">{{ Object.values(appearNote.reactionCounts).reduce((a, c) => a + c, 0) }}</p>
				</button>
				<button v-if="appearNote.myReaction != null" class="reactionButton reacted button" @click="undoReact(appearNote)" ref="reactButton" :title="$t('undo-reaction')">
					<fa icon="minus"/>
					<p class="count" v-if="Object.values(appearNote.reactionCounts).some(x => x)">{{ Object.values(appearNote.reactionCounts).reduce((a, c) => a + c, 0) }}</p>
				</button>
				<button @click="menu()" ref="menuButton" class="button">
					<fa icon="ellipsis-h"/>
				</button>
			</footer>
			<div class="deleted" v-if="appearNote.deletedAt != null">{{ $t('deleted') }}</div>
		</div>
	</article>
	<x-sub v-for="note in replies" :key="note.id" :note="note"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';

import XSub from './note.sub.vue';
import noteMixin from '../../../common/scripts/note-mixin';
import noteSubscriber from '../../../common/scripts/note-subscriber';
import { faClock } from '@fortawesome/free-regular-svg-icons';
import XInstanceInfo from '../../../common/views/components/instance-info.vue';
import XVisibilityIcon from '../../../common/views/components/visibility-icon.vue';

export default Vue.extend({
	i18n: i18n('desktop/views/components/note.vue'),

	components: {
		XSub,
		XVisibilityIcon,
		XInstanceInfo,
	},

	mixins: [
		noteMixin(),
		noteSubscriber('note')
	],

	props: {
		note: {
			type: Object,
			required: true
		},
		detail: {
			type: Boolean,
			required: false,
			default: false
		},
		compact: {
			type: Boolean,
			required: false,
			default: false
		},
		preview: {
			type: Boolean,
			required: false,
			default: false
		},
		mini: {
			type: Boolean,
			required: false,
			default: false
		},
	},

	inject: {
		narrow: {
			default: false
		}
	},

	data() {
		return {
			faClock,
			conversation: [],
			replies: []
		};
	},

	created() {
		if (this.detail) {
			this.$root.api('notes/children', {
				noteId: this.appearNote.id,
				limit: 30
			}).then(replies => {
				this.replies = replies;
			});

			this.$root.api('notes/conversation', {
				noteId: this.appearNote.replyId
			}).then(conversation => {
				this.conversation = conversation.reverse();
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.note
	margin 0
	padding 0
	overflow hidden
	box-shadow 0 1px 8px rgba(0, 0, 0, 0.2)

	&.mini
		font-size 13px

		> .renote
			padding 6px 16px 2px

			.avatar
				width 20px
				height 20px

		> .article
			padding 16px 16px 4px

			> .avatar
				margin 0 10px 8px 0
				width 42px
				height 42px

	&:last-of-type
		border-bottom none

	&:focus
		z-index 1

		&:after
			content ""
			pointer-events none
			position absolute
			top 2px
			right 2px
			bottom 2px
			left 2px
			border 2px solid var(--primaryAlpha03)
			border-radius 4px

	> .renote + article
		padding-top 8px

	> .reply-to
		&.coloring-bg
			&.visibility-home
				background-color var(--noteHomeBg)

			&.visibility-followers
				background-color var(--noteFollowersBg)

			&.visibility-specified
				background-color var(--noteSpecifiedBg)

		&.coloring-left
			border-left: transparent solid 5px

			&.visibility-home
				border-left-color var(--noteHomeBorder)

			&.visibility-followers
				border-left-color var(--noteFollowersBorder)

			&.visibility-specified
				border-left-color var(--noteSpecifiedBorder)

	> .article
		display flex
		padding 16px 32px 8px 32px

		&.coloring-bg
			&.visibility-home
				background-color var(--noteHomeBg)

			&.visibility-followers
				background-color var(--noteFollowersBg)

			&.visibility-specified
				background-color var(--noteSpecifiedBg)

		&.coloring-left
			border-left: transparent solid 5px

			&.visibility-home
				border-left-color var(--noteHomeBorder)

			&.visibility-followers
				border-left-color var(--noteFollowersBorder)

			&.visibility-specified
				border-left-color var(--noteSpecifiedBorder)

		&:hover
			> .main > footer > button
				color var(--noteActionsHighlighted)

		> .avatar
			flex-shrink 0
			display block
			margin 0 16px 10px 0
			width 58px
			height 58px
			border-radius 8px
			//position -webkit-sticky
			//position sticky
			//top 74px

		> .main
			flex 1
			min-width 0

			> .body

				> .cw
					cursor default
					display block
					margin 0
					padding 0
					overflow-wrap break-word
					color var(--noteText)

					> .text
						margin-right 8px

				> .content

					> .text
						cursor default
						display block
						margin 0
						padding 0
						overflow-wrap break-word
						color var(--noteText)
						font-size 1m

						&.scroll
							max-height 200px
							overflow hidden auto
							padding-left 0.2em

						> .reply
							margin-right 8px
							color var(--text)

						> .rp
							margin-left 4px
							font-style oblique
							color var(--renoteText)

					> .location
						margin 4px 0
						font-size 12px
						color #ccc

					> .map
						width 100%
						height 300px

						&:empty
							display none

					.mk-url-preview
						margin-top 8px

					> .mk-poll
						font-size 80%

					> .renote
						margin 0.3em 0.6em
						opacity 0.9

						> *
							padding 0.7em
							border-left 3px solid var(--mfmQuoteLine)

			> .footer
				> .time, .visibility-info, .app
					display block
					color var(--noteHeaderInfo)
					font-size 0.9em

				> .button
					margin 0 28px 0 0
					padding 0 8px
					line-height 32px
					font-size 1em
					color var(--noteActions)
					background transparent
					border none
					cursor pointer

					&:last-child
						margin-right 0

					&:hover
						color var(--noteActionsHover)

					&.replyButton:hover
						color var(--noteActionsReplyHover)

					&.renoteButton:hover
						color var(--noteActionsRenoteHover)

					&.renoteButton.renoted
						color var(--primary)

					&.reactionButton:hover
						color var(--noteActionsReactionHover)

					&.inhibitedButton
						cursor not-allowed

					> .count
						display inline
						margin 0 0 0 8px
						color var(--text)
						opacity 0.7

					&.reacted, &.reacted:hover
						color var(--noteActionsReactionHover)

			> .deleted
				color var(--noteText)
				opacity 0.7

</style>
