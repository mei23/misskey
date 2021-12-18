<template>
<div class="mk-autocomplete" @contextmenu.prevent="() => {}">
	<ol class="users" ref="suggests" v-if="users.length > 0">
		<li v-for="user in users" @click="complete(type, user)" @keydown="onKeydown" tabindex="-1" :key="user.id">
			<img class="avatar" :src="user.avatarUrl" alt=""/>
			<span class="name">
				<mk-user-name :user="user" :key="user.id"/>
			</span>
			<span class="username">@{{ user | acct }}</span>
		</li>
	</ol>
	<ol class="hashtags" ref="suggests" v-if="hashtags.length > 0">
		<li v-for="hashtag in hashtags" @click="complete(type, hashtag)" @keydown="onKeydown" tabindex="-1" :key="hashtag">
			<span class="name">{{ hashtag }}</span>
		</li>
	</ol>
	<ol class="emojis" ref="suggests" v-if="emojis.length > 0">
		<li v-for="emoji in emojis" @click="complete(type, emoji.emoji)" @keydown="onKeydown" tabindex="-1" :key="emoji.emoji">
			<span class="emoji" v-if="emoji.isCustomEmoji"><img :src="$store.state.device.disableShowingAnimatedImages ? getStaticImageUrl(emoji.url) : emoji.url" :alt="emoji.emoji"/></span>
			<span class="emoji" v-else><img :src="emoji.url" :alt="emoji.emoji"/></span>
			<span class="name" v-html="emoji.name.replace(q, `<b>${q}</b>`)"></span>
			<span class="alias" v-if="emoji.aliasOf">({{ emoji.aliasOf }})</span>
		</li>
	</ol>
	<ol class="mfms" ref="suggests" v-if="mfms.length > 0">
		<li v-for="mfm in mfms" @click="complete(type, mfm)" @keydown="onKeydown" tabindex="-1" :key="mfm.name">
			<div class="name">{{ mfm.name }}</div>
			<div class="desc">
				<mfm v-if="mfm.desc" :text="mfm.desc" :plain="true" :extra="true" :nowrap="true"/>
			</div>
		</li>
	</ol>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { emojilist } from '../../../../../misc/emojilist';
import contains from '../../../common/scripts/contains';
import { twemojiSvgBase } from '../../../../../misc/twemoji-base';
import { getStaticImageUrl } from '../../../common/scripts/get-static-image-url';

type EmojiDef = {
	emoji: string;
	name: string;
	aliasOf?: string;
	url?: string;
	isCustomEmoji?: boolean;
};

const lib = emojilist.filter(x => x.category !== 'flags');

const char2file = (char: string) => {
	let codes = Array.from(char).map(x => x.codePointAt(0).toString(16));
	if (!codes.includes('200d')) codes = codes.filter(x => x != 'fe0f');
	codes = codes.filter(x => x && x.length);
	return codes.join('-');
};

const emjdb: EmojiDef[] = lib.map(x => ({
	emoji: x.char,
	name: x.name,
	aliasOf: null,
	url: `${twemojiSvgBase}/${char2file(x.char)}.svg`
}));

for (const x of lib) {
	if (x.keywords) {
		for (const k of x.keywords) {
			emjdb.push({
				emoji: x.char,
				name: k,
				aliasOf: x.name,
				url: `${twemojiSvgBase}/${char2file(x.char)}.svg`
			});
		}
	}
}

emjdb.sort((a, b) => a.name.length - b.name.length);

type MfmDef = {
	name: string;	// jump
	head: string;	// <jump>
	tail: string;	// </jump>
	desc?: string;
}

const angleDb: MfmDef[] = [
	{ name: 'small', head: '<small>', tail: '</small>', desc: '<small>small</small>' },
	{ name: 'i', head: '<i>', tail: '</i>', desc: '<small>italic</small>' },
	{ name: 'sup', head: '<sup>', tail: '</sup>', desc: 'foo<sup>sup</sup>' },
	{ name: 'sub', head: '<sub>', tail: '</sub>', desc: 'foo<sub>sub</sub>' },
	{ name: 'center', head: '<center>', tail: '</center>' },

	{ name: 'motion', head: '<motion>', tail: '</motion>', desc: '<motion>🍮</motion>' },
	{ name: 'jump', head: '<jump>', tail: '</jump>', desc: '<jump>🍮</jump>' },
	{ name: 'blink', head: '<blink>', tail: '</blink>', desc: '<blink>🍮</blink>' },
	{ name: 'twitch', head: '<twitch>', tail: '</twitch>', desc: '<twitch>🍮</twitch>' },
	{ name: 'shake', head: '<shake>', tail: '</shake>', desc: '<shake>🍮</shake>' },

	{ name: 'rgbshift', head: '<rgbshift>', tail: '</rgbshift>', desc: '<rgbshift>rpgshift</rgbshift>' },

	{ name: 'x1', head: '<x1>', tail: '</x1>', desc: '<x1>🍮</x1>' },
	{ name: 'x2', head: '<x2>', tail: '</x2>', desc: '<x2>🍮</x2>' },
	{ name: 'x3', head: '<x3>', tail: '</x3>', desc: '<x3>🍮</x3>' },
	{ name: 'x4', head: '<x4>', tail: '</x4>', desc: '<x4>🍮</x4>' },

	{ name: 'color', head: '<color red blue>', tail: '</color>' },

	{ name: 'flip', head: '<flip>', tail: '</flip>', desc: '<flip>flip</flip>' },
	{ name: 'vflip', head: '<vflip>', tail: '</vflip>', desc: '<vflip>vflip</vflip>' },

	{ name: 'spin', head: '<spin>', tail: '</spin>', desc: '<spin>spin</spin>' },
	{ name: 'spin left', head: '<spin left>', tail: '</spin>', desc: '<spin left>spin</spin>' },
	{ name: 'spin alternate', head: '<spin alternate>', tail: '</spin>', desc: '<spin left>spin</spin>'},

	{ name: 'xspin', head: '<xspin>', tail: '</xspin>', desc: '<xspin left>xspin</xspin>' },
	{ name: 'xspin left', head: '<xspin left>', tail: '</xspin>', desc: '<xspin left>xspin</xspin>' },
	{ name: 'xspin alternate', head: '<xspin alternate>', tail: '</xspin>', desc: '<xspin left>xspin</xspin>' },

	{ name: 'yspin', head: '<yspin>', tail: '</yspin>', desc: '<yspin left>yspin</yspin>' },
	{ name: 'yspin left', head: '<yspin left>', tail: '</yspin>', desc: '<yspin left>yspin</yspin>' },
	{ name: 'yspin alternate', head: '<yspin alternate>', tail: '</yspin>', desc: '<yspin left>yspin</yspin>' },

	{ name: 'rotate', head: '<rotate DEG>', tail: '</rotate>', desc: '<rotate 20>rotate</rotate>' },

	{ name: 'marquee', head: '<marquee>', tail: '</marquee>' },
	{ name: 'marquee reverse', head: '<marquee reverse>', tail: '</marquee>' },
	{ name: 'marquee alternate', head: '<marquee alternate>', tail: '</marquee>' },
	{ name: 'marquee slide', head: '<marquee slide>', tail: '</marquee>' },
];

const fnDb: MfmDef[] = [
	{ name: 'jelly', head: '$[jelly ', tail: ']', desc: '$[jelly 🍮]' },
	{ name: 'tada', head: '$[tada ', tail: ']', desc: '$[tada 🍮]' },
	{ name: 'jump', head: '$[jump ', tail: ']', desc: '$[jump 🍮]' },
	{ name: 'bounce', head: '$[bounce ', tail: ']', desc: '$[bounce 🍮]' },
	{ name: 'shake', head: '$[shake ', tail: ']', desc: '$[shake 🍮]' },
	{ name: 'twitch', head: '$[twitch ', tail: ']', desc: '$[twitch 🍮]' },

	{ name: 'flip', head: '$[flip ', tail: ']', desc: '$[flip flip]' },
	{ name: 'flip.v', head: '$[flip.v ', tail: ']', desc: '$[flip.v flip]' },
	{ name: 'flip.v,h', head: '$[flip.v,h ', tail: ']', desc: '$[flip.v,h flip]' },

	{ name: 'spin', head: '$[spin ', tail: ']', desc: '$[spin spin]' },
	{ name: 'spin.x', head: '$[spin.x ', tail: ']', desc: '$[spin.x spin]' },
	{ name: 'spin.y', head: '$[spin.y ', tail: ']', desc: '$[spin.y spin]' },

	{ name: 'x1', head: '$[x1 ', tail: ']', desc: '$[x1 🍮]' },
	{ name: 'x2', head: '$[x2 ', tail: ']', desc: '$[x2 🍮]' },
	{ name: 'x3', head: '$[x3 ', tail: ']', desc: '$[x3 🍮]' },
	{ name: 'x4', head: '$[x4 ', tail: ']', desc: '$[x4 🍮]' },

	{ name: 'blur', head: '$[blur ', tail: ']', desc: '$[blur 🍮]' },

	{ name: 'font.serif', head: '$[font.serif ', tail: ']', desc: '$[font.serif serif]' },
	{ name: 'font.monospace', head: '$[font.monospace ', tail: ']', desc: '$[font.monospace monospace]' },
];

export default Vue.extend({
	props: ['type', 'q', 'textarea', 'complete', 'close', 'x', 'y', 'localOnly'],

	data() {
		return {
			getStaticImageUrl,
			fetching: true,
			users: [],
			hashtags: [],
			emojis: [] as EmojiDef[],
			mfms: [] as MfmDef[],
			items: [],
			select: -1,
			emojilist,
			emojiDb: [] as EmojiDef[]
		}
	},

	updated() {
		//#region 位置調整
		if (this.x + this.$el.offsetWidth > window.innerWidth) {
			this.$el.style.left = (window.innerWidth - this.$el.offsetWidth) + 'px';
		} else {
			this.$el.style.left = this.x + 'px';
		}

		if (this.y + this.$el.offsetHeight > window.innerHeight) {
			this.$el.style.top = (this.y - this.$el.offsetHeight) + 'px';
			this.$el.style.marginTop = '0';
		} else {
			this.$el.style.top = this.y + 'px';
			this.$el.style.marginTop = 'calc(1em + 8px)';
		}
		//#endregion

		this.items = (this.$refs.suggests as Element | undefined)?.children || [];
	},

	mounted() {
		//#region Construct Emoji DB
		const customEmojis = (this.$root.getMetaSync() || { emojis: [] }).emojis || [];
		const emojiDefinitions: EmojiDef[] = [];

		for (const x of customEmojis) {
			emojiDefinitions.push({
				name: x.name,
				emoji: `:${x.name}:`,
				url: x.url,
				isCustomEmoji: true
			});

			if (x.aliases) {
				for (const alias of x.aliases) {
					emojiDefinitions.push({
						name: alias,
						aliasOf: x.name,
						emoji: `:${x.name}:`,
						url: x.url,
						isCustomEmoji: true
					});
				}
			}
		}

		emojiDefinitions.sort((a, b) => a.name.length - b.name.length);

		this.emojiDb = emojiDefinitions.concat(emjdb);
		//#endregion

		this.textarea.addEventListener('keydown', this.onKeydown);

		for (const el of Array.from(document.querySelectorAll('body *'))) {
			el.addEventListener('mousedown', this.onMousedown);
		}

		this.$nextTick(() => {
			this.exec();

			this.$watch('q', () => {
				this.$nextTick(() => {
					this.exec();
				});
			});
		});
	},

	beforeDestroy() {
		this.textarea.removeEventListener('keydown', this.onKeydown);

		for (const el of Array.from(document.querySelectorAll('body *'))) {
			el.removeEventListener('mousedown', this.onMousedown);
		}
	},

	methods: {
		exec() {
			this.select = -1;
			if (this.$refs.suggests) {
				for (const el of Array.from(this.items)) {
					el.removeAttribute('data-selected');
				}
			}

			if (this.type == 'user') {
				this.$root.api('users/search', {
					query: `@${this.q}`,
					localOnly: !!this.localOnly,
					limit: 20,
					detail: false
				}, false, false).then(users => {
					this.users = users;
					this.fetching = false;
				});
			} else if (this.type == 'hashtag') {
				if (this.q == null || this.q == '') {
					this.hashtags = JSON.parse(localStorage.getItem('hashtags') || '[]');
					this.fetching = false;
				} else {
					this.$root.api('hashtags/search', {
						query: this.q,
						limit: 30
					}, false, true).then(hashtags => {
						this.hashtags = hashtags;
						this.fetching = false;
					});
				}
			} else if (this.type == 'emoji') {
				// :だけはカスタム絵文字全件
				if (this.q == null || this.q == '') {
					this.emojis = this.emojiDb.filter(x => x.isCustomEmoji && !x.aliasOf).sort((a, b) => {
						var textA = a.name.toUpperCase();
						var textB = b.name.toUpperCase();
						return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
					});
					return;
				}

				const matched: any[] = [];
				const max = 30;

				// 完全一致
				if (matched.length < max) {
					this.emojiDb.some(x => {
						if (x.name === this.q && !matched.some(y => y.emoji == x.emoji)) matched.push(x);
						return matched.length == max;
					});
				}

				// カスタム絵文字マッチ
				if (matched.length < max) {
					this.emojiDb.some(x => {
						if (x.name.includes(this.q) && x.isCustomEmoji && !x.aliasOf && !matched.some(y => y.emoji == x.emoji)) matched.push(x);
						return matched.length == max;
					});
				}

				if (matched.length < max) {
					this.emojiDb.some(x => {
						if (x.name.startsWith(this.q) && !x.aliasOf && !matched.some(y => y.emoji == x.emoji)) matched.push(x);
						return matched.length == max;
					});
				}

				if (matched.length < max) {
					this.emojiDb.some(x => {
						if (x.name.startsWith(this.q) && !matched.some(y => y.emoji == x.emoji)) matched.push(x);
						return matched.length == max;
					});
				}

				if (matched.length < max) {
					this.emojiDb.some(x => {
						if (x.name.includes(this.q) && !matched.some(y => y.emoji == x.emoji)) matched.push(x);
						return matched.length == max;
					});
				}

				this.emojis = matched;
			} else if (this.type === 'mfm') {
				if (this.q.startsWith('<')) {
					const name = this.q.substr(1);
					const db = angleDb.filter(x => x.name.startsWith(name));
					this.mfms = db;
				} else if (this.q.startsWith('$[')) {
					const name = this.q.substr(2);
					const db = fnDb.filter(x => x.name.startsWith(name));
					this.mfms = db;
				}
			}
		},

		onMousedown(e) {
			if (!contains(this.$el, e.target) && (this.$el != e.target)) this.close();
		},

		onKeydown(e) {
			const cancel = () => {
				e.preventDefault();
				e.stopPropagation();
			};

			switch (e.which) {
				case 10: // [ENTER]
				case 13: // [ENTER]
					if (this.select !== -1) {
						cancel();
						(this.items[this.select] as any).click();
					} else {
						this.close();
					}
					break;

				case 27: // [ESC]
					cancel();
					this.close();
					break;

				case 38: // [↑]
					if (this.select !== -1) {
						cancel();
						this.selectPrev();
					} else {
						this.close();
					}
					break;

				case 9: // [TAB]
				case 40: // [↓]
					cancel();
					this.selectNext();
					break;

				default:
					e.stopPropagation();
					this.textarea.focus();
			}
		},

		selectNext() {
			if (++this.select >= this.items.length) this.select = 0;
			if (this.items.length === 0) this.select = -1;
			this.applySelect();
		},

		selectPrev() {
			if (--this.select < 0) this.select = this.items.length - 1;
			this.applySelect();
		},

		applySelect() {
			for (const el of Array.from(this.items)) {
				el.removeAttribute('data-selected');
			}

			if (this.select !== -1) {
				this.items[this.select].setAttribute('data-selected', 'true');
				(this.items[this.select] as any).focus();
			}
		}
	}
});
</script>

<style lang="stylus" scoped>
.mk-autocomplete
	position fixed
	z-index 65535
	max-width 100%
	margin-top calc(1em + 8px)
	overflow hidden
	background var(--secondary)
	border solid 1px rgba(#000, 0.1)
	border-radius 4px
	transition top 0.1s ease, left 0.1s ease

	> ol
		display block
		margin 0
		padding 4px 0
		max-height 190px
		max-width 500px
		overflow auto
		list-style none

		> li
			display flex
			align-items center
			padding 4px 12px
			white-space nowrap
			overflow hidden
			font-size 0.9em
			color rgba(#000, 0.8)
			cursor default

			&, *
				user-select none

			*
				overflow hidden
				text-overflow ellipsis

			&:hover
				background var(--autocompleteItemHoverBg)

			&[data-selected='true']
				background var(--primary)

				&, *
					color #fff !important

			&:active
				background var(--primaryDarken10)

				&, *
					color #fff !important

	> .users > li

		.avatar
			min-width 28px
			min-height 28px
			max-width 28px
			max-height 28px
			margin 0 8px 0 0
			border-radius 100%

		.name
			margin 0 8px 0 0
			color var(--autocompleteItemText)

		.username
			color var(--autocompleteItemTextSub)

	> .hashtags > li

		.name
			color var(--autocompleteItemText)

	> .emojis > li

		.emoji
			display inline-block
			margin 0 4px 0 0
			width 24px

			> img
				width 24px
				vertical-align bottom

		.name
			color var(--autocompleteItemText)

		.alias
			margin 0 0 0 8px
			color var(--autocompleteItemTextSub)

	> .mfms > li 
		display flex
		justify-content space-between
		color var(--autocompleteItemText)

		.name
			margin-right 1em
</style>
