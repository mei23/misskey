<template>
<div class="mk-welcome-timeline">
	<transition-group name="ldzpakcixzickvggyixyrhqwjaefknon" tag="div">
		<div v-if="!disableTimelinePreview" v-for="note in notes" :key="note.id">
			<mk-avatar class="avatar" :user="note.user" target="_blank"/>
			<div class="body">
				<header>
					<router-link class="name" :to="note.user | userPage" v-user-preview="note.user.id">
						<mk-user-name :user="note.user"/>
					</router-link>
					<span class="username">@{{ note.user | acct }}</span>
					<div class="info">
						<router-link class="created-at" :to="note | notePage">
							<mk-time :time="note.createdAt"/>
						</router-link>
					</div>
				</header>
				<div class="text">
					<mfm v-if="note.text" :text="note.cw != null ? note.cw : note.text" :author="note.user" :custom-emojis="note.emojis" :hashtags="note.tags" :basic="!!note.notHaveDecorationMfm"/>
				</div>
				<mk-reactions-viewer class="reactions" :note="note"/>
			</div>
		</div>
	</transition-group>
</div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
	props: {
		max: {
			type: Number,
			required: false,
			default: undefined
		}
	},

	data() {
		return {
			fetching: true,
			notes: [],
			disableTimelinePreview: false,
		};
	},

	created() {
		this.$root.getMeta().then(meta => {
			this.disableTimelinePreview = meta.disableTimelinePreview;
		});
	},

	mounted() {
		this.fetch();
	},

	beforeDestroy() {
		this.connection.dispose();
	},

	methods: {
		fetch() {
			this.fetching = true;

			this.$root.api('notes/featured', {
				limit: this.max,
				days: 0.5,
				excludeNsfw: true,
			}, false, true).then((notes: any[]) => {
				notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				this.notes = notes;
				this.fetching = false;
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.ldzpakcixzickvggyixyrhqwjaefknon-enter
.ldzpakcixzickvggyixyrhqwjaefknon-leave-to
	opacity 0
	transform translateY(-30px)

.mk-welcome-timeline
	background var(--face)

	> div
		> *
			transition transform .3s ease, opacity .3s ease

		> div
			padding 16px
			overflow-wrap break-word
			font-size .9em
			color var(--noteText)

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
				width 42px
				height 42px
				border-radius 6px

			> .body
				float right
				width calc(100% - 42px)
				padding-left 12px

				> header
					display flex
					align-items center
					white-space nowrap

					> .name
						display block
						margin 0 .5em 0 0
						padding 0
						overflow hidden
						font-weight bold
						text-overflow ellipsis
						color var(--noteHeaderName)

					> .username
						margin 0 .5em 0 0
						color var(--noteHeaderAcct)

					> .info
						margin-left auto
						font-size 0.9em

						> .created-at
							color var(--noteHeaderInfo)

				> .text
					text-align left
					max-height 120px
					overflow auto
					margin-left 0.2em
				
				> .reactions
					pointer-events none
</style>
