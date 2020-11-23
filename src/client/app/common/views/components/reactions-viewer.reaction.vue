<template>
<span
	class="reaction"
	:class="{ reacted: note.myReaction == reaction, canToggle }"
	@click="toggleReaction(reaction)"
	v-if="count > 0"
	@touchstart="onMouseover"
	@mouseover="onMouseover"
	@mouseleave="onMouseleave"
	@touchend="onMouseleave"
	ref="reaction"
>
	<mk-reaction-icon :reaction="reaction" :customEmojis="note.emojis" ref="icon"/>
	<span>{{ count }}</span>
</span>
</template>

<script lang="ts">
import Vue from 'vue';
import XDetails from './reactions-viewer.details.vue';

export default Vue.extend({
	props: {
		reaction: {
			type: String,
			required: true,
		},
		count: {
			type: Number,
			required: true,
		},
		note: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			details: null,
			detailsTimeoutId: null,
			isHovering: false
		};
	},
	computed: {
		canToggle(): boolean {
			return !this.reaction.match(/@\w/);
		},
	},
	methods: {
		toggleReaction() {
			if (!this.canToggle) return;

			const oldReaction = this.note.myReaction;
			if (oldReaction) {
				this.$root.api('notes/reactions/delete', {
					noteId: this.note.id
				}).then(() => {
					if (oldReaction !== this.reaction) {
						this.$root.api('notes/reactions/create', {
							noteId: this.note.id,
							reaction: this.reaction
						});
					}
				});
			} else {
				this.$root.api('notes/reactions/create', {
					noteId: this.note.id,
					reaction: this.reaction
				});
			}
		},
		onMouseover() {
			this.isHovering = true;
			this.detailsTimeoutId = setTimeout(this.openDetails, 300);
		},
		onMouseleave() {
			this.isHovering = false;
			clearTimeout(this.detailsTimeoutId);
			this.closeDetails();
		},
		openDetails() {
			this.$root.api('notes/reactions', {
				noteId: this.note.id,
				type: this.reaction,
				limit: 11
			}).then((reactions: any[]) => {
				const users = reactions
					.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
					.map(x => x.user);

				this.closeDetails();
				if (!this.isHovering) return;
				this.details = this.$root.new(XDetails, {
					reaction: this.reaction,
					customEmojis: this.note.emojis,
					users,
					count: this.count,
					source: this.$refs.reaction
				});
			});
		},
		closeDetails() {
			if (this.details != null) {
				this.details.close();
				this.details = null;
			}
		},
	}
});
</script>

<style lang="stylus" scoped>
.reaction
	display inline-block
	height 32px
	margin 2px
	padding 0 6px
	border-radius 4px

	*
		user-select none
		-moz-user-select none
		pointer-events none

	&.canToggle
		background var(--reactionViewerButtonBg)
		cursor pointer

		&:hover
			background var(--reactionViewerButtonHoverBg)

	&.reacted
		background var(--primary)
		cursor pointer

		> span
			color var(--primaryForeground)

	> span
		font-size 1.1em
		line-height 32px
		color var(--text)
</style>
