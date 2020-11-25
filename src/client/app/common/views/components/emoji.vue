<template>
<!-- カスタム絵文字 -->
<img v-if="customEmoji" class="fvgwvorwhxigeolkkrcderjzcawqrscl custom" :class="{ normal: normal }" :src="url" :alt="alt" :title="title"/>
<!-- 絵文字 Vendor (OS, Browser) -->
<span v-else-if="char && vendor">{{ char }}</span>
<!-- 絵文字 General -->
<img v-else-if="char && this.fallbackUrl" class="fvgwvorwhxigeolkkrcderjzcawqrscl" :src="url" :alt="alt" :title="alt" :onerror="`this.src='${fallbackUrl}'`"/>
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

const tw2full: Record<string, string> = {
	'0023-20e3': '0023-fe0f-20e3',
	'002a-20e3': '002a-fe0f-20e3',
	'0030-20e3': '0030-fe0f-20e3',
	'0031-20e3': '0031-fe0f-20e3',
	'0032-20e3': '0032-fe0f-20e3',
	'0033-20e3': '0033-fe0f-20e3',
	'0034-20e3': '0034-fe0f-20e3',
	'0035-20e3': '0035-fe0f-20e3',
	'0036-20e3': '0036-fe0f-20e3',
	'0037-20e3': '0037-fe0f-20e3',
	'0038-20e3': '0038-fe0f-20e3',
	'0039-20e3': '0039-fe0f-20e3',
	'00a9': '00a9-fe0f',
	'00ae': '00ae-fe0f',
	'1f170': '1f170-fe0f',
	'1f171': '1f171-fe0f',
	'1f17e': '1f17e-fe0f',
	'1f17f': '1f17f-fe0f',
	'1f202': '1f202-fe0f',
	'1f237': '1f237-fe0f',
	'1f321': '1f321-fe0f',
	'1f324': '1f324-fe0f',
	'1f325': '1f325-fe0f',
	'1f326': '1f326-fe0f',
	'1f327': '1f327-fe0f',
	'1f328': '1f328-fe0f',
	'1f329': '1f329-fe0f',
	'1f32a': '1f32a-fe0f',
	'1f32b': '1f32b-fe0f',
	'1f32c': '1f32c-fe0f',
	'1f336': '1f336-fe0f',
	'1f37d': '1f37d-fe0f',
	'1f396': '1f396-fe0f',
	'1f397': '1f397-fe0f',
	'1f399': '1f399-fe0f',
	'1f39a': '1f39a-fe0f',
	'1f39b': '1f39b-fe0f',
	'1f39e': '1f39e-fe0f',
	'1f39f': '1f39f-fe0f',
	'1f3cb': '1f3cb-fe0f',
	'1f3cc': '1f3cc-fe0f',
	'1f3cd': '1f3cd-fe0f',
	'1f3ce': '1f3ce-fe0f',
	'1f3d4': '1f3d4-fe0f',
	'1f3d5': '1f3d5-fe0f',
	'1f3d6': '1f3d6-fe0f',
	'1f3d7': '1f3d7-fe0f',
	'1f3d8': '1f3d8-fe0f',
	'1f3d9': '1f3d9-fe0f',
	'1f3da': '1f3da-fe0f',
	'1f3db': '1f3db-fe0f',
	'1f3dc': '1f3dc-fe0f',
	'1f3dd': '1f3dd-fe0f',
	'1f3de': '1f3de-fe0f',
	'1f3df': '1f3df-fe0f',
	'1f3f3': '1f3f3-fe0f',
	'1f3f5': '1f3f5-fe0f',
	'1f3f7': '1f3f7-fe0f',
	'1f43f': '1f43f-fe0f',
	'1f441': '1f441-fe0f',
	'1f4fd': '1f4fd-fe0f',
	'1f549': '1f549-fe0f',
	'1f54a': '1f54a-fe0f',
	'1f56f': '1f56f-fe0f',
	'1f570': '1f570-fe0f',
	'1f573': '1f573-fe0f',
	'1f574': '1f574-fe0f',
	'1f575': '1f575-fe0f',
	'1f576': '1f576-fe0f',
	'1f577': '1f577-fe0f',
	'1f578': '1f578-fe0f',
	'1f579': '1f579-fe0f',
	'1f587': '1f587-fe0f',
	'1f58a': '1f58a-fe0f',
	'1f58b': '1f58b-fe0f',
	'1f58c': '1f58c-fe0f',
	'1f58d': '1f58d-fe0f',
	'1f590': '1f590-fe0f',
	'1f5a5': '1f5a5-fe0f',
	'1f5a8': '1f5a8-fe0f',
	'1f5b1': '1f5b1-fe0f',
	'1f5b2': '1f5b2-fe0f',
	'1f5bc': '1f5bc-fe0f',
	'1f5c2': '1f5c2-fe0f',
	'1f5c3': '1f5c3-fe0f',
	'1f5c4': '1f5c4-fe0f',
	'1f5d1': '1f5d1-fe0f',
	'1f5d2': '1f5d2-fe0f',
	'1f5d3': '1f5d3-fe0f',
	'1f5dc': '1f5dc-fe0f',
	'1f5dd': '1f5dd-fe0f',
	'1f5de': '1f5de-fe0f',
	'1f5e1': '1f5e1-fe0f',
	'1f5e3': '1f5e3-fe0f',
	'1f5e8': '1f5e8-fe0f',
	'1f5ef': '1f5ef-fe0f',
	'1f5f3': '1f5f3-fe0f',
	'1f5fa': '1f5fa-fe0f',
	'1f6cb': '1f6cb-fe0f',
	'1f6cd': '1f6cd-fe0f',
	'1f6ce': '1f6ce-fe0f',
	'1f6cf': '1f6cf-fe0f',
	'1f6e0': '1f6e0-fe0f',
	'1f6e1': '1f6e1-fe0f',
	'1f6e2': '1f6e2-fe0f',
	'1f6e3': '1f6e3-fe0f',
	'1f6e4': '1f6e4-fe0f',
	'1f6e5': '1f6e5-fe0f',
	'1f6e9': '1f6e9-fe0f',
	'1f6f0': '1f6f0-fe0f',
	'1f6f3': '1f6f3-fe0f',
	'203c': '203c-fe0f',
	'2049': '2049-fe0f',
	'2122': '2122-fe0f',
	'2139': '2139-fe0f',
	'2194': '2194-fe0f',
	'2195': '2195-fe0f',
	'2196': '2196-fe0f',
	'2197': '2197-fe0f',
	'2198': '2198-fe0f',
	'2199': '2199-fe0f',
	'21a9': '21a9-fe0f',
	'21aa': '21aa-fe0f',
	'2328': '2328-fe0f',
	'23cf': '23cf-fe0f',
	'23ed': '23ed-fe0f',
	'23ee': '23ee-fe0f',
	'23ef': '23ef-fe0f',
	'23f1': '23f1-fe0f',
	'23f2': '23f2-fe0f',
	'23f8': '23f8-fe0f',
	'23f9': '23f9-fe0f',
	'23fa': '23fa-fe0f',
	'24c2': '24c2-fe0f',
	'25aa': '25aa-fe0f',
	'25ab': '25ab-fe0f',
	'25b6': '25b6-fe0f',
	'25c0': '25c0-fe0f',
	'25fb': '25fb-fe0f',
	'25fc': '25fc-fe0f',
	'2600': '2600-fe0f',
	'2601': '2601-fe0f',
	'2602': '2602-fe0f',
	'2603': '2603-fe0f',
	'2604': '2604-fe0f',
	'260e': '260e-fe0f',
	'2611': '2611-fe0f',
	'2618': '2618-fe0f',
	'261d': '261d-fe0f',
	'2620': '2620-fe0f',
	'2622': '2622-fe0f',
	'2623': '2623-fe0f',
	'2626': '2626-fe0f',
	'262a': '262a-fe0f',
	'262e': '262e-fe0f',
	'262f': '262f-fe0f',
	'2638': '2638-fe0f',
	'2639': '2639-fe0f',
	'263a': '263a-fe0f',
	'2640': '2640-fe0f',
	'2642': '2642-fe0f',
	'265f': '265f-fe0f',
	'2660': '2660-fe0f',
	'2663': '2663-fe0f',
	'2665': '2665-fe0f',
	'2666': '2666-fe0f',
	'2668': '2668-fe0f',
	'267b': '267b-fe0f',
	'267e': '267e-fe0f',
	'2692': '2692-fe0f',
	'2694': '2694-fe0f',
	'2695': '2695-fe0f',
	'2696': '2696-fe0f',
	'2697': '2697-fe0f',
	'2699': '2699-fe0f',
	'269b': '269b-fe0f',
	'269c': '269c-fe0f',
	'26a0': '26a0-fe0f',
	'26a7': '26a7-fe0f',
	'26b0': '26b0-fe0f',
	'26b1': '26b1-fe0f',
	'26c8': '26c8-fe0f',
	'26cf': '26cf-fe0f',
	'26d1': '26d1-fe0f',
	'26d3': '26d3-fe0f',
	'26e9': '26e9-fe0f',
	'26f0': '26f0-fe0f',
	'26f1': '26f1-fe0f',
	'26f4': '26f4-fe0f',
	'26f7': '26f7-fe0f',
	'26f8': '26f8-fe0f',
	'26f9': '26f9-fe0f',
	'2702': '2702-fe0f',
	'2708': '2708-fe0f',
	'2709': '2709-fe0f',
	'270c': '270c-fe0f',
	'270d': '270d-fe0f',
	'270f': '270f-fe0f',
	'2712': '2712-fe0f',
	'2714': '2714-fe0f',
	'2716': '2716-fe0f',
	'271d': '271d-fe0f',
	'2721': '2721-fe0f',
	'2733': '2733-fe0f',
	'2734': '2734-fe0f',
	'2744': '2744-fe0f',
	'2747': '2747-fe0f',
	'2763': '2763-fe0f',
	'2764': '2764-fe0f',
	'27a1': '27a1-fe0f',
	'2934': '2934-fe0f',
	'2935': '2935-fe0f',
	'2b05': '2b05-fe0f',
	'2b06': '2b06-fe0f',
	'2b07': '2b07-fe0f',
	'3030': '3030-fe0f',
	'303d': '303d-fe0f',
	'3297': '3297-fe0f',
	'3299': '3299-fe0f',
};

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
			fallbackUrl: undefined,
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

		twemojiUrl(): string {
			let codes: string[] = Array.from(this.char).map(x => x.codePointAt(0).toString(16));
			codes = codes.filter(x => x && x.length);
			if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
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
			const flavor = this.$store.state.device.emojiFlavor;

			let codes: string[] = Array.from(this.char).map(x => x.codePointAt(0).toString(16));
			codes = codes.filter(x => x && x.length);

			// Vendor (OS, Browser) 
			if (this.local) {
				if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
				this.url = `/assets/emojis/${codes.join('-')}.svg`;
				return;
			}

			if (flavor === 'google' || flavor === 'apple' || flavor === 'facebook') {
				const emojiDataVersion = '6.0.0';
				if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
				codes = codes.map(x => x.length < 4 ? ('000' + x).slice(-4) : x);
				let b = `${codes.join('-')}`;
				if (tw2full[b]) b = tw2full[b];
				this.url = `https://cdnjs.cloudflare.com/ajax/libs/emoji-datasource-${flavor}/${emojiDataVersion}/img/${flavor}/64/${b}.png`;
				this.fallbackUrl = this.twemojiUrl;
				return;
			}

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

		&:hover
			transform scale(1.2)

		&.normal
			height 1.25em
			vertical-align -0.25em

			&:hover
				transform none

</style>
