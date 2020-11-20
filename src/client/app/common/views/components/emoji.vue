<template>
<img v-if="customEmoji" class="fvgwvorwhxigeolkkrcderjzcawqrscl custom" :class="{ normal: normal }" :src="url" :alt="alt" :title="title"/>
<span v-else-if="char && vendor">{{ char }}</span>
<img v-else-if="char" class="fvgwvorwhxigeolkkrcderjzcawqrscl" :src="url" :alt="alt" :title="alt"/>
<span v-else-if="isReaction">❔</span>
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
	},

	data() {
		return {
			url: null,
			char: null,
			customEmoji: null
		}
	},

	computed: {
		alt(): string {
			return this.customEmoji ? `:${this.customEmoji.resolvable || this.customEmoji.name}:` : this.char;
		},

		title(): string {
			return this.customEmoji ? `:${this.customEmoji.name}:` : this.char;
		},
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
			const flavor = 'noto';

			let codes: string[] = Array.from(this.char).map(x => x.codePointAt(0).toString(16));
			codes = codes.filter(x => x && x.length);

			if (this.local) {
				if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
				this.url = `/assets/emojis/${codes.join('-')}.svg`;
				return;
			}

			if (flavor === 'noto') {
				// TODO: shibuya109, GB sub division
				if (this.char.match(/^(?:\uD83C[\uDDE6-\uDDFF]){2}$/)) {
					const cc = [
						String.fromCharCode(this.char.codePointAt(0) - 127397),
						String.fromCharCode(this.char.codePointAt(2) - 127397)
					];
					this.url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/tree/master/third_party/region-flags/svg/${cc.join('')}.svg`;	// TODO: 遅いし, max-age=300 なので
					return
				}

				codes = codes.filter(x => x != 'fe0f');
				codes = codes.map(x => x.length < 4 ? ('000' + x).slice(-4) : x);
				this.url = `https://raw.githubusercontent.com/googlefonts/noto-emoji/master/svg/emoji_u${codes.join('_')}.svg`;	// TODO: 遅いし, max-age=300 なので
				return;
			}

			if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
			this.url = `${twemojiSvgBase}/${codes.join('-')}.svg`;
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

		&:hover
			transform scale(1.2)

		&.normal
			height 1.25em
			vertical-align -0.25em

			&:hover
				transform none

</style>
