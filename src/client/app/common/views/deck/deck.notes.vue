<template>
<div class="eamppglmnmimdhrlzhplwpvyeaqmmhxu">
	<div class="empty" v-if="notes.length == 0 && !fetching && inited">{{ $t('@.no-notes') }}</div>

	<mk-error v-if="!fetching && !inited" @retry="init()"/>

	<div class="placeholder" v-if="fetching">
		<template v-for="i in 10">
			<mk-note-skeleton :key="i"/>
		</template>
	</div>

	<!-- トランジションを有効にするとなぜかメモリリークする -->
	<component :is="!$store.state.device.reduceMotion ? 'transition-group' : 'div'" name="mk-notes" class="transition notes" ref="notes" tag="div">
		<template v-for="(note, i) in _notes">
			<mk-note
				:note="note"
				:next="_notes[i + 1]"
				:prev="_notes[i - 1]"
				:key="note.id"
				@update:note="onNoteUpdated(i, $event)"
				:compact="true"
			/>
		</template>
	</component>

	<footer v-if="cursor != null">
		<button @click="more" :disabled="moreFetching" :style="{ cursor: moreFetching ? 'wait' : 'pointer' }">
			<template v-if="!moreFetching">{{ $t('@.load-more') }}</template>
			<template v-if="moreFetching"><fa icon="spinner" pulse fixed-width/></template>
		</button>
	</footer>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { shouldMuteNote } from '../../../common/scripts/should-mute-note';

const displayLimit = 20;

export default Vue.extend({
	i18n: i18n(),

	inject: ['column', 'isScrollTop', 'count'],

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
			rootEl: null,
			notes: [],
			queue: [],
			fetching: true,
			moreFetching: false,
			inited: false,
			cursor: null
		};
	},

	computed: {
		_notes(): any[] {
			return (this.notes as any).filter(x => x.stayTl).concat((this.notes as any).filter(x => !x.stayTl));
		}
	},

	watch: {
		queue(q) {
			this.count(q.length);
		},
		makePromise() {
			this.init();
		}
	},

	created() {
		this.column.$on('top', this.onTop);
		this.column.$on('bottom', this.onBottom);
		this.init();
	},

	beforeDestroy() {
		this.column.$off('top', this.onTop);
		this.column.$off('bottom', this.onBottom);
	},

	methods: {
		focus() {
			(this.$refs.notes as any).children[0].focus ? (this.$refs.notes as any).children[0].focus() : (this.$refs.notes as any).$el.children[0].focus();
		},

		onNoteUpdated(i, note) {
			Vue.set((this as any).notes, i, note);
		},

		reload() {
			this.init();
		},

		init() {
			this.queue = [];
			this.notes = [];
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
				this.notes = this.notes.concat(x.notes);
				this.cursor = x.cursor;
				this.moreFetching = false;
			}, e => {
				this.moreFetching = false;
			});
		},

		prepend(note, silent = false) {
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

		onTop() {
			this.releaseQueue();
		},

		onBottom() {
			this.more();
		}
	}
});
</script>

<style lang="stylus" scoped>
.eamppglmnmimdhrlzhplwpvyeaqmmhxu
	.transition
		.mk-notes-enter
		.mk-notes-leave-to
			opacity 0
			transform translateY(-30px)
		> *
			transition transform .3s ease, opacity .3s ease
	> .empty
		padding 16px
		text-align center
		color var(--text)

	> .placeholder
		padding 16px
		opacity 0.3

	> .notes
		> .date
			display block
			margin 0
			line-height 28px
			font-size 12px
			text-align center
			color var(--dateDividerFg)
			background var(--dateDividerBg)

			span
				margin 0 16px

			[data-icon]
				margin-right 8px

	> footer
		> button
			display block
			margin 0
			padding 16px
			width 100%
			text-align center
			color #ccc
			background var(--face)
			border-top solid var(--lineWidth) var(--faceDivider)
			border-bottom-left-radius 6px
			border-bottom-right-radius 6px

			&:hover
				box-shadow 0 0 0 100px inset rgba(0, 0, 0, 0.05)

			&:active
				box-shadow 0 0 0 100px inset rgba(0, 0, 0, 0.1)

</style>
