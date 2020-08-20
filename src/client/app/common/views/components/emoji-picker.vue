<template>
<div class="prlncendiewqqkrevzeruhndoakghvtx">
	<header>
		<button v-for="category in categories"
			:title="category.text"
			@click="go(category)"
			:class="{ active: category.isActive }"
			:key="category.text"
		>
			<fa :icon="category.icon" fixed-width/>
		</button>
	</header>
	<div class="emojis">
		<header v-if="!reaction" class="menu">
			<ui-switch v-model="pinned">{{ $t('pinned') }}</ui-switch>
		</header>
		<template v-if="categories[0].isActive">
			<header class="category"><fa :icon="faHistory" fixed-width/> {{ $t('recent-emoji') }}</header>
			<div class="list">
				<button v-for="(emoji, i) in ($store.state.device.recentEmojis || [])"
					:title="emoji.sources ? emoji.sources.map(x => `${x.name}@${x.host}`).join(',\n') : emoji.name"
					@click="chosen(emoji)"
					:key="i"
				>
					<mk-emoji v-if="emoji.char != null" :emoji="emoji.char"/>
					<img v-else :src="$store.state.device.disableShowingAnimatedImages ? getStaticImageUrl(emoji.url) : emoji.url"/>
				</button>
			</div>
		</template>

		<header class="category">
			<fa :icon="categories.find(x => x.isActive).icon" fixed-width/>
			{{ categories.find(x => x.isActive).text }}
			<div class="skinTones" v-if="categories.find(x => x.isActive).name === 'people'">
				<button class="skinTone" v-for="st in SKIN_TONES" :key="st" @click="changeSkinTone(st)">
					<mk-emoji :emoji="getSkinToneModifiedChar(SKIN_TONES_SAMPLE, st)"/>
				</button>
			</div>
		</header>
		<template v-if="categories.find(x => x.isActive).name">
			<div class="list">
				<button v-for="emoji in emojilist.filter(e => e.category === categories.find(x => x.isActive).name)"
					:title="emoji.name"
					@click="chosen(emoji, skinTone)"
					:key="`${emoji.name}-${skinTone}`"
				>
					<mk-emoji :emoji="emojiToSkinToneModifiedChar(emoji, skinTone)"/>
				</button>
			</div>
		</template>
		<template v-else>
			<div v-for="(key, i) in Object.keys(customEmojis)" :key="i">
				<header class="sub">{{ key || $t('no-category') }}</header>
				<div class="list">
					<button v-for="emoji in customEmojis[key]"
						:title="emoji.name"
						@click="chosen(emoji)"
						:key="emoji.name"
					>
						<img :src="$store.state.device.disableShowingAnimatedImages ? getStaticImageUrl(emoji.url) : emoji.url"/>
					</button>
				</div>
			</div>

			<header class="category" v-if="includeRemote"><fa :icon="faGlobe" fixed-width/> {{ $t('remote-emoji') }}</header>
			<div class="list" v-if="remoteEmojis != null">
				<button v-for="emoji in remoteEmojis"
					:title="emoji.sources ? emoji.sources.map(x => `${x.name}@${x.host}`).join(',\n') : emoji.name"
					@click="chosen(emoji)"
					:key="emoji.name"
				>
					<img :src="$store.state.device.disableShowingAnimatedImages ? getStaticImageUrl(emoji.url) : emoji.url"/>
				</button>
			</div>
			<div v-else-if="includeRemote" class="load-remote">
				<ui-button @click="loadRemote()">
					{{ $t('load-remote') }}
				</ui-button>
			</div>
		</template>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { emojilist } from '../../../../../misc/emojilist';
import { getStaticImageUrl } from '../../../common/scripts/get-static-image-url';
import { faAsterisk, faUser, faLeaf, faUtensils, faFutbol, faCity, faDice, faGlobe, faHistory } from '@fortawesome/free-solid-svg-icons';
import { faHeart, faFlag } from '@fortawesome/free-regular-svg-icons';
import { groupBy } from '../../../../../prelude/array';

const SKIN_TONES_SAMPLE = '\u{1F44D}';	// thumbs up
const SKIN_TONES = [ null, '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}' ];

export default Vue.extend({
	i18n: i18n('common/views/components/emoji-picker.vue'),

	props: {
		includeRemote: {
			type: Boolean,
			required: false,
			default: false
		},
		reaction: {
			type: Boolean,
			required: false,
			default: false
		},
	},

	data() {
		return {
			SKIN_TONES_SAMPLE,
			SKIN_TONES,
			pinned: false,
			emojilist,
			getStaticImageUrl,
			customEmojis: {},
			remoteEmojis: null,
			skinTone: null,
			faGlobe, faHistory,
			categories: [{
				text: this.$t('custom-emoji'),
				icon: faAsterisk,
				isActive: true
			}, {
				name: 'face',
				text: this.$t('face'),
				icon: ['far', 'laugh'],
				isActive: false
			}, {
				name: 'people',
				text: this.$t('people'),
				icon: faUser,
				isActive: false
			}, {
				name: 'animals_and_nature',
				text: this.$t('animals-and-nature'),
				icon: faLeaf,
				isActive: false
			}, {
				name: 'food_and_drink',
				text: this.$t('food-and-drink'),
				icon: faUtensils,
				isActive: false
			}, {
				name: 'activity',
				text: this.$t('activity'),
				icon: faFutbol,
				isActive: false
			}, {
				name: 'travel_and_places',
				text: this.$t('travel-and-places'),
				icon: faCity,
				isActive: false
			}, {
				name: 'objects',
				text: this.$t('objects'),
				icon: faDice,
				isActive: false
			}, {
				name: 'symbols',
				text: this.$t('symbols'),
				icon: faHeart,
				isActive: false
			}, {
				name: 'flags',
				text: this.$t('flags'),
				icon: faFlag,
				isActive: false
			}]
		}
	},

	created() {
		let local = (this.$root.getMetaSync() || { emojis: [] }).emojis || [];
		local = groupBy(local, (x: any) => x.category || '');
		this.customEmojis = local;

		if (this.$store.state.device.activeEmojiCategoryName) {
			this.goCategory(this.$store.state.device.activeEmojiCategoryName);
		}

		if (SKIN_TONES.includes(this.$store.state.device.emojiSkinTone)) {
			this.skinTone = this.$store.state.device.emojiSkinTone;
		}
	},

	methods: {
		loadRemote() {
			this.$root.api('emojis/recommendation', {
				origin: 'remote',
			}).then((emojis: any[]) => {
				this.remoteEmojis = emojis;
			});
		},
		go(category: any) {
			this.goCategory(category.name);
		},

		goCategory(name: string) {
			let matched = false;
			for (const c of this.categories) {
				c.isActive = c.name === name;
				if (c.isActive) {
					matched = true;
					this.$store.commit('device/set', { key: 'activeEmojiCategoryName', value: c.name });
				}
			}
			if (!matched) {
				this.categories[0].isActive = true;
			}
		},

		changeSkinTone(skinTone: string) {
			this.skinTone = skinTone;
			this.$store.commit('device/set', { key: 'emojiSkinTone', value: skinTone });
		},

		emojiToSkinToneModifiedChar(emoji: any, skinTone: string | null | undefined): string {
			if (emoji.st === 1) {
				return this.getSkinToneModifiedChar(emoji.char, skinTone);
			} else {
				return emoji.char;
			}
		},

		getSkinToneModifiedChar(char: string, skinTone: string | null | undefined): string {
			if (!skinTone) return char;

			let sgs = Array.from(char);	// split by surrogate pair

			// 2文字目に挿入するが、そこが絵文字セレクタなら置き換える
			if (sgs[1] === '\u{FE0F}') {
				sgs.splice(1, 1, skinTone);
			} else {
				sgs.splice(1, 0, skinTone);
			}

			return sgs.join('');
		},

		chosen(emoji: any, skinTone?: string) {
			const getKey = (emoji: any) => emoji.char ? this.getSkinToneModifiedChar(emoji.char, skinTone) : `:${emoji.name}:`;

			let recents = this.$store.state.device.recentEmojis || [];
			recents = recents.filter((e: any) => getKey(e) !== getKey(emoji));
			recents.unshift(emoji)
			this.$store.commit('device/set', { key: 'recentEmojis', value: recents.splice(0, 16) });

			this.$emit('chosen', {
				emoji: getKey(emoji),
				close: !this.pinned,
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.prlncendiewqqkrevzeruhndoakghvtx
	width 350px
	background var(--secondary)

	> header
		display flex

		> button
			flex 1
			padding 10px 0
			font-size 16px
			color var(--text)
			transition color 0.2s ease

			&:hover
				color var(--textHighlighted)
				transition color 0s

			&.active
				color var(--primary)
				transition color 0s

	> .emojis
		height 300px
		overflow-y auto
		overflow-x hidden

		> header.menu
			padding 0.5em

		> header.category
			position sticky
			top 0
			left 0
			z-index 1
			padding 8px
			background var(--popupBg)
			color var(--text)
			font-size 12px

			> .skinTones
				display inline-flex
				position absolute
				right 8px

				> .skinTone
					padding: 0 3px

		>>> header.sub
			padding 4px 8px
			color var(--text)
			font-size 12px

		>>> div.list
			display grid
			grid-template-columns 1fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr
			gap 4px
			padding 8px

			> button
				padding 0
				width 100%

				&:before
					content ''
					display block
					width 1px
					height 0
					padding-bottom 100%

				&:hover
					> *
						transform scale(1.2)
						transition transform 0s

				> *
					position absolute
					top 0
					left 0
					width 100%
					height 100%
					object-fit contain
					font-size 28px
					transition transform 0.2s ease
					pointer-events none
		
		>>> div.load-remote
			padding 0.5em

</style>
