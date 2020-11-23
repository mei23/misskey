<template>
<div class="rdfaahpb" v-hotkey.global="keymap">
	<div class="backdrop" ref="backdrop" @click="close"></div>
	<div class="popover" :class="{ isMobile: $root.isMobile }" ref="popover">
		<div class="buttons" ref="buttons">
			<button v-for="(reaction, i) in rs" :key="i" @click="react(reaction)" :tabindex="i + 1" :title="/^[a-z]+$/.test(reaction) ? $t('@.reactions.' + reaction) : reaction" v-particle><mk-reaction-icon :reaction="reaction"/></button>
		</div>
		<div class="text">
			<input v-model="text" placeholder="Emoji" @keyup.enter="reactText" @keydown.esc="close" @input="tryReactText" v-autocomplete="{ model: 'text', noZwsp: true }" ref="text">
			<button title="OK" @click="reactText"><fa icon="check"/></button>
			<button title="Pick" class="emoji" @click="emoji" ref="emoji"><fa :icon="['far', 'laugh']"/></button>
			<button title="Random" @click="reactRandom()"><fa :icon="faRandom"/></button>
			<button title="Dislike" class="dislike" v-if="$store.state.device.showDislikeInPicker" :class="{ disliked }" @click="toggleDisliked()"><fa :icon="disliked ? faThumbsDown : faThumbsUp"/></button>
		</div>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import anime from 'animejs';
import { emojiRegex } from '../../../../../misc/emoji-regex';
import { faRandom, faThumbsUp, faThumbsDown } from '@fortawesome/free-solid-svg-icons';
import { emojilist } from '../../../../../misc/emojilist';

export default Vue.extend({
	i18n: i18n('common/views/components/reaction-picker.vue'),
	props: {
		source: {
			required: true
		},

		reactions: {
			required: false
		},

		animation: {
			type: Boolean,
			required: false,
			default: true
		}
	},

	data() {
		return {
			faRandom, faThumbsUp, faThumbsDown,
			rs: this.reactions || this.$store.state.settings.reactions,
			text: null,
			disliked: false,
		};
	},

	computed: {
		keymap(): any {
			return {
				'esc': this.close,
			};
		}
	},

	created() {
		if (this.$store.state.device.enableRandomReactionPicker) {
			const list = emojilist.filter(x => x.category !== 'flags').map((x: any) => x.char);
			const result = [];

			for (let i = 0; i < 10; i++) {
				const index = Math.floor(Math.random() * list.length);
				const reaction = list[index];
				result.push(reaction);
			}
			this.rs = result;
		}

		this.rs = this.rs.concat(this.$store.state.device.recentReactions || []);
	},

	mounted() {
		const fixPos = () => {
			const popover = this.$refs.popover as HTMLElement;
			const sourceRect = (this.source as HTMLElement).getBoundingClientRect();

			// このポップアップのサイズ
			const popW = popover.offsetWidth;
			const popH = popover.offsetHeight;

			// 呼び出し元 (たいていボタン) の中心地点
			const sourceX = sourceRect.left + (this.source.offsetWidth / 2);
			const sourceY = sourceRect.top + (this.source.offsetHeight / 2);

			// このポップアップは呼び出し元の中心に配置
			let popX = sourceX - (popover.offsetWidth / 2);
			let popY = sourceY - (popover.offsetHeight / 2);

			// 右はみ出し判定
			if (popX + popW > window.innerWidth) popX = window.innerWidth - popW;
			// 下はみ出し判定
			if (popY + popH > window.innerHeight) popY = window.innerHeight - popH;
			// 左はみ出し判定
			if (popX < 0) popX = 0;
			// 上はみ出し判定
			if (popY < 0) popY = 0;

			popover.style.left = `${popX + window.pageXOffset}px`;
			popover.style.top = `${popY + window.pageYOffset}px`;
		};

		this.$nextTick(() => {
			fixPos();

			if (!this.$root.isMobile && this.$refs.text) this.$refs.text.focus();

			anime({
				targets: this.$refs.backdrop,
				opacity: 1,
				duration: this.animation ? 100 : 0,
				easing: 'linear'
			});

			anime({
				targets: this.$refs.popover,
				opacity: 1,
				scale: [0.5, 1],
				duration: this.animation ? 500 : 0
			});
		});
	},

	methods: {
		react(reaction: string) {
			this.$emit('chosen', reaction, this.disliked);

			// recent
			if (this.rs.includes(reaction)) return;

			let recents = this.$store.state.device.recentReactions || [];
			recents = recents.filter((x: string) => x !== reaction);
			recents.unshift(reaction);
			this.$store.commit('device/set', { key: 'recentReactions', value: recents.splice(0, this.$store.state.device.recentReactionsCount) });
		},

		reactText() {
			if (!this.text) return;
			this.react(this.text);
		},

		tryReactText() {
			if (!this.text) return;

			// 数字でリアクション
			const d = this.text.match(/^[0-9]$/);
			if (d) {
				let i = Number(d[0]);
				i--;
				if (i === -1) i = 9;
				const char = this.rs[i];
				if (char) {
					this.react(char);
					return;
				}
			}

			const m = this.text.match(emojiRegex);
			if (!m) return;
			this.react(m[1]);
		},

		reactRandom() {
			let list = emojilist.filter(x => x.category !== 'flags').map((x: any) => x.char);
			let local = ((this.$root.getMetaSync() || { emojis: [] }).emojis || []).map((x: any) => `:${x.name}:`);
			list = list.concat(local);

			const index = Math.floor(Math.random() * list.length);
			const reaction = list[index];
			this.react(reaction);
		},

		async emoji() {
			const Picker = await import('../../../desktop/views/components/emoji-picker-dialog.vue').then(m => m.default);
			const button = this.$refs.emoji;
			const rect = button.getBoundingClientRect();
			const vm = this.$root.new(Picker, {
				reaction: true,
				x: button.offsetWidth + rect.left + window.pageXOffset,
				y: rect.top + window.pageYOffset
			});
			vm.$once('chosen', emoji => {
				const m = emoji.match(emojiRegex);
				this.react(m ? m[1] : emoji);
			});
			this.$once('hook:beforeDestroy', () => {
				vm.close();
			});
		},

		close() {
			(this.$refs.backdrop as any).style.pointerEvents = 'none';
			anime({
				targets: this.$refs.backdrop,
				opacity: 0,
				duration: this.animation ? 200 : 0,
				easing: 'linear'
			});

			(this.$refs.popover as any).style.pointerEvents = 'none';
			anime({
				targets: this.$refs.popover,
				opacity: 0,
				scale: 0.5,
				duration: this.animation ? 200 : 0,
				easing: 'easeInBack',
				complete: () => {
					this.$emit('closed');
					this.destroyDom();
				}
			});
		},

		toggleDisliked() {
			const old = this.disliked;
			this.$nextTick(() => {
				this.disliked = !old;
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.rdfaahpb
	position initial

	> .backdrop
		position fixed
		top 0
		left 0
		z-index 10000
		width 100%
		height 100%
		background var(--modalBackdrop)
		opacity 0

	> .popover
		$bgcolor = var(--popupBg)
		position absolute
		z-index 10001
		background $bgcolor
		border-radius 4px
		box-shadow 0 3px 12px rgba(27, 31, 35, 0.15)
		transform scale(0.5)
		opacity 0

		&.isMobile
			> div
				width 280px

				> button
					width 50px
					height 50px
					font-size 28px
					border-radius 4px

		> p
			display block
			margin 0
			padding 8px 10px
			font-size 14px
			color var(--popupFg)
			border-bottom solid var(--lineWidth) var(--faceDivider)

		> .buttons
			padding 4px 0px 8px 8px
			width 216px
			text-align left

			> button
				padding 0
				width 40px
				height 40px
				font-size 24px
				border-radius 2px

				> *
					height 1em

				&:hover
					background var(--reactionPickerButtonHoverBg)

				&:active
					background var(--primary)
					box-shadow inset 0 0.15em 0.3em rgba(27, 31, 35, 0.15)

		> .text
			display flex
			justify-content center
			align-items center
			width 216px

			> input
				width 100%
				padding 10px
				margin 0
				font-size 16px
				color var(--desktopPostFormTextareaFg)
				background var(--desktopPostFormTextareaBg)
				outline none
				border solid 1px var(--primaryAlpha01)
				border-radius 4px
				transition border-color .2s ease

				&:hover
					border-color var(--primaryAlpha02)
					transition border-color .1s ease

			> button
				cursor pointer
				padding 0 8px
				margin 0
				font-size 1em
				color var(--desktopPostFormTransparentButtonFg)
				background transparent
				outline none
				border solid 1px transparent
				border-radius 4px

				&.emoji, &.dislike
					color var(--text)
					opacity 0.7

				&.disliked
					color red
					opacity 1

</style>
