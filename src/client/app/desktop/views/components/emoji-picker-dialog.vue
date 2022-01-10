<template>
<div class="gcafiosrssbtbnbzqupfmglvzgiaipyv">
	<x-picker :includeRemote="includeRemote" :reaction="reaction" @chosen="chosen"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import contains from '../../../common/scripts/contains';

export default Vue.extend({
	components: {
		XPicker: () => import('../../../common/views/components/emoji-picker.vue').then(m => m.default)
	},

	props: {
		reaction: {
			type: Boolean,
			required: false,
			default: false
		},
		x: {
			type: Number,
			required: true
		},
		y: {
			type: Number,
			required: true
		}
	},

	mounted() {
		this.$nextTick(() => {
			// nextTickだと間に合わない？ので最小サイズを指定
			const width = Math.max(this.$el.offsetWidth, 350);
			const height = Math.max(this.$el.offsetHeight, 390);

			let x = this.x - window.pageXOffset;
			let y = this.y - window.pageYOffset;

			// 右はみ出し判定
			if (x + width > window.innerWidth) x = window.innerWidth - width;
			// 下はみ出し判定
			if (y + height > window.innerHeight) y = window.innerHeight - height;
			// 左はみ出し判定
			if (x < 0) x = 0;
			// 上はみ出し判定
			if (y < 0) y = 0;

			this.$el.style.left = `${x + window.pageXOffset}px`;
			this.$el.style.top = `${y + window.pageYOffset}px`;

			for (const el of Array.from(document.querySelectorAll('body *'))) {
				el.addEventListener('mousedown', this.onMousedown);
			}
		});
	},

	methods: {
		onMousedown(e) {
			if (!contains(this.$el, e.target) && (this.$el != e.target)) {
				e.preventDefault();
				this.close();
				return false;
			} else {
				return true;
			}
		},

		chosen(args: { emoji: string, close: boolean }) {
			this.$emit('chosen', args.emoji);
			if (args.close) this.close();
		},

		close() {
			for (const el of Array.from(document.querySelectorAll('body *'))) {
				el.removeEventListener('mousedown', this.onMousedown);
			}

			this.$emit('closed');
			this.destroyDom();
		}
	}
});
</script>

<style lang="stylus" scoped>
.gcafiosrssbtbnbzqupfmglvzgiaipyv
	position absolute
	top 0
	left 0
	z-index 13000
	box-shadow 0 2px 12px 0 rgba(0, 0, 0, 0.3)

</style>
