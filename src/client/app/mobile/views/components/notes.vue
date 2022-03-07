<template>
<div class="ivaojijs">
	<div class="empty" v-if="notes.length == 0 && !fetching && inited">{{ $t('@.no-notes') }}</div>

	<mk-error v-if="!fetching && !inited" @retry="init()"/>

	<div class="placeholder" v-if="fetching">
		<template v-for="i in 10">
			<mk-note-skeleton :key="i"/>
		</template>
	</div>

	<header v-if="paged">
		<button @click="reload">{{ $t('@.newest') }}</button>
	</header>

	<!-- トランジションを有効にするとなぜかメモリリークする -->
	<component :is="!$store.state.device.reduceMotion ? 'transition-group' : 'div'" name="mk-notes" class="transition" tag="div">
		<template v-for="(note, i) in _notes">
			<mk-note :note="note" :next="_notes[i + 1]" :prev="_notes[i - 1]" :key="note.id" @update:note="onNoteUpdated(i, $event)"/>
		</template>
	</component>

	<footer v-if="cursor != null">
		<button @click="more" :disabled="moreFetching" :style="{ cursor: moreFetching ? 'wait' : 'pointer' }">
			<template v-if="moreFetching"><fa icon="spinner" pulse fixed-width/></template>
			<template v-else-if="hasNextPage">{{ $t('@.next-page') }}</template>
			<template v-else>{{ $t('@.load-more') }}</template>
		</button>
	</footer>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { shouldMuteNote } from '../../../common/scripts/should-mute-note';
import { getSpeechName, getSpeechText } from '../../../../../misc/get-note-speech';

const displayLimit = 30;

export default Vue.extend({
	i18n: i18n(),

	props: {
		timeSplitters: {
			type: Array,
			required: false,
			default: (): any[] => [],
		},
		makePromise: {
			required: true
		}
	},

	data() {
		return {
			notes: [],
			queue: [],
			fetching: true,
			moreFetching: false,
			paged: false,
			inited: false,
			cursor: null
		};
	},

	computed: {
		_notes(): any[] {
			return (this.notes as any).filter(x => x.stayTl).concat((this.notes as any).filter(x => !x.stayTl));
		},

		hasNextPage(): boolean {
			return this.cursor != null && this.notes.length >= displayLimit * 5;
		},
	},

	watch: {
		queue(x) {
			if (x.length > 0) {
				this.$store.commit('indicate', true);
			} else {
				this.$store.commit('indicate', false);
			}
		}
	},

	created() {
		this.init();
	},

	mounted() {
		window.addEventListener('scroll', this.onScroll, { passive: true });
	},

	beforeDestroy() {
		window.removeEventListener('scroll', this.onScroll);
	},

	methods: {
		isScrollTop() {
			return window.scrollY <= 8;
		},

		onNoteUpdated(i, note) {
			Vue.set((this as any).notes, i, note);
		},

		reload() {
			this.paged = false;
			this.queue = [];
			this.notes = [];
			this.init();
		},

		init() {
			this.fetching = true;
			this.makePromise().then(x => {
				if (Array.isArray(x)) {
					this.notes = x;
				} else {
					this.notes = x.notes;
					this.cursor = x.cursor;
				}
				this.inited = true;
				this.fetching = false;
				this.$emit('inited');
			}, e => {
				this.fetching = false;
			});
		},

		more() {
			if (this.cursor == null || this.moreFetching) return;
			this.moreFetching = true;
			this.makePromise(this.cursor).then(x => {
				// 改ページ
				if (this.hasNextPage) {
					this.paged = true;
					this.notes = x.notes;
					this.queue = [];
					window.scrollTo({
						top: 0
					});
				} else {
					this.notes = this.notes.concat(x.notes);
				}
				this.cursor = x.cursor;
				this.moreFetching = false;
			}, e => {
				this.moreFetching = false;
			});
		},

		prepend(note, silent = false) {
			if (this.paged) return;

			// 弾く
			if (shouldMuteNote(this.$store.state.i, this.$store.state.settings, note)) return;

			// 既存をRenoteされたらそこを置き換える
			if (note.renoteId && !note.text && !note.poll && (!note.fileIds || !note.fileIds.length)) {
				for (let i = 0; i < 100; i++) {
					if (!this.notes[i]) break;

					// 引用投稿はスキップ
					if (this.notes[i].renoteId && (this.notes[i].text || this.notes[i].poll || this.notes[i].fileIds?.length > 0)) {
						continue;
					}

					const extId = this.notes[i].renoteId || this.notes[i].id;
					const newId = note.renoteId || note.id;

					if (extId == newId) {
						Vue.set((this as any).notes, i, note);
						return;
					}
				}
			}

			if (this.isScrollTop()) {
				// Prepend the note
				this.notes.unshift(note);

				// オーバーフローしたら古い投稿は捨てる
				if (this.notes.length >= displayLimit) {
					let i = 0;
					this.notes = this.notes.filter(note => note.stayTl || i++ < displayLimit);
					this.cursor = this.notes[this.notes.length - 1].id
				}
			} else {
				this.queue.push(note);
			}

			if (this.$store.state.device.enableSpeech && !silent) {
				const name = getSpeechName(note);
				const nameUttr = new SpeechSynthesisUtterance(name);
				nameUttr.pitch = 2;

				const text = getSpeechText(note);
				const textUttr = new SpeechSynthesisUtterance(text);

				if (getSpeechText) {
					speechSynthesis.speak(nameUttr);
					speechSynthesis.speak(textUttr);
				}
			}
		},

		append(note) {
			this.notes.push(note);
			this.cursor = this.notes[this.notes.length - 1].id
		},

		releaseQueue() {
			for (const n of this.queue) {
				this.prepend(n, true);
			}
			this.queue = [];
		},

		onScroll() {
			if (this.isScrollTop()) {
				this.releaseQueue();
			}

			if (this.$store.state.settings.fetchOnScroll !== false) {
				if (this.hasNextPage) return;
				// 親要素が display none だったら弾く
				// https://github.com/syuilo/misskey/issues/1569
				// http://d.hatena.ne.jp/favril/20091105/1257403319
				if (this.$el.offsetHeight == 0) return;

				const current = window.scrollY + window.innerHeight;
				if (current > document.body.offsetHeight - 8) this.more();
			}
		}
	}
});
</script>

<style lang="stylus" scoped>
.ivaojijs
	overflow hidden
	background var(--face)
	border-radius 8px
	box-shadow 0 4px 16px rgba(#000, 0.1)

		@media (min-width 500px)
			box-shadow 0 8px 32px rgba(#000, 0.1)

	> .empty
		padding 16px
		text-align center
		color var(--text)

	.transition
		.mk-notes-enter
		.mk-notes-leave-to
			opacity 0
			transform translateY(-30px)

		> *
			transition transform .3s ease, opacity .3s ease

		> .date
			display block
			margin 0
			line-height 32px
			text-align center
			font-size 0.9em
			color var(--dateDividerFg)
			background var(--dateDividerBg)

			span
				margin 0 16px

			[data-icon]
				margin-right 8px

	> .placeholder
		padding 16px
		opacity 0.3

		@media (min-width 500px)
			padding 32px

	> .empty
		margin 0 auto
		padding 32px
		max-width 400px
		text-align center
		color var(--text)

	> header, footer
		text-align center
		border-top solid var(--lineWidth) var(--faceDivider)
		border-bottom solid var(--lineWidth) var(--faceDivider)

		&:empty
			display none

		> button
			margin 0
			padding 16px
			width 100%
			color var(--text)

			@media (min-width 500px)
				padding 20px

			&:disabled
				opacity 0.7

</style>
