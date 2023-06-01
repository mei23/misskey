<template>
<!-- カスタム絵文字 -->
<img v-if="customEmoji" class="fvgwvorwhxigeolkkrcderjzcawqrscl custom" :class="{ normal: normal, flip: requireFlip }" :src="url" :alt="alt" :title="title"/>
<!-- 絵文字 Vendor (OS, Browser) -->
<span v-else-if="char && vendor">{{ char }}</span>
<!-- 絵文字 General -->
<img v-else-if="char" class="fvgwvorwhxigeolkkrcderjzcawqrscl" :src="url" :alt="alt" :title="alt"/>
<!-- エラー - リアクション -->
<span v-else-if="isReaction"></span>
<!-- エラー - リアクション以外 -->
<span v-else>:{{ name }}:</span>
</template>

<script lang="ts">
import Vue from 'vue';
import { getStaticImageUrl } from '../../../common/scripts/get-static-image-url';
import { twemojiSvgBase } from '../../../../../misc/twemoji-base';

export default Vue.extend({
	props: {
		name: {
			type: String,
			required: false
		},
		emoji: {
			type: String,
			required: false
		},
		normal: {
			type: Boolean,
			required: false,
			default: false
		},
		customEmojis: {
			required: false,
			default: () => []
		},
		isReaction: {
			type: Boolean,
			default: false
		},
		vendor: {
			type: Boolean,
			default: false
		},
		local: {
			type: Boolean,
			default: false
		},
		direction: {
			type: String,
			default: 'none'
		},
	},

	data() {
		return {
			url: null,
			char: null,
			customEmoji: null,
			requireFlip: false,
		}
	},

	computed: {
		alt(): string {
			return this.customEmoji ? `:${this.customEmoji.resolvable || this.customEmoji.name}:` : this.char;
		},

		title(): string {
			return this.customEmoji ? `:${this.customEmoji.name}:` : this.char;
		},

		twemojiUrl(): string {
			// 合字をサロゲートペア単位で分割
			let codes: string[] = Array.from(this.char).map(x => x.codePointAt(0).toString(16));
			codes = codes.filter(x => x && x.length);
			// 200d(joiner) を含まない場合は 最後の fe0f (絵文字セレクタを削除する)
			if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
			// 参照先はTwemoji CDN
			return `${twemojiSvgBase}/${codes.join('-')}.svg`;
		}
	},

	watch: {
		customEmojis() {
			if (this.name) {
				const customEmoji = this.customEmojis.find(x => x.name == this.name);
				if (customEmoji) {
					this.customEmoji = customEmoji;
					this.url = this.$store.state.device.disableShowingAnimatedImages
						? getStaticImageUrl(customEmoji.url)
						: customEmoji.url;
					this.requireFlip = (this.direction === 'right' && customEmoji.direction === 'left') || (this.direction === 'left' && customEmoji.direction === 'right');
				}
			}
		},
	},

	created() {
		if (this.name) {
			const customEmoji = this.customEmojis.find(x => x && x.name === this.name);
			if (customEmoji) {
				this.customEmoji = customEmoji;
				this.url = this.$store.state.device.disableShowingAnimatedImages
					? getStaticImageUrl(customEmoji.url)
					: customEmoji.url;
					this.requireFlip = (this.direction === 'right' && customEmoji.direction === 'left') || (this.direction === 'left' && customEmoji.direction === 'right');
			} else {
				//const emoji = lib[this.name];
				//if (emoji) {
				//	this.char = emoji.char;
				//}
			}
		} else {
			this.char = this.emoji;
		}

		if (this.char) {
			// 合字をサロゲートペア単位で分割
			let codes: string[] = Array.from(this.char).map(x => x.codePointAt(0).toString(16));
			codes = codes.filter(x => x && x.length);
			this.url = this.twemojiUrl;
		}
	},
});
</script>

<style lang="stylus" scoped>
.fvgwvorwhxigeolkkrcderjzcawqrscl
	height 1.25em
	vertical-align -0.25em

	&.custom
		height 2.5em
		vertical-align middle
		transition transform 0.2s ease

		&.flip
			transform scaleX(-1)

		&:hover
			transform scale(1.2)

		&.normal
			height 1.25em
			vertical-align -0.25em

			&:hover
				transform none

</style>
