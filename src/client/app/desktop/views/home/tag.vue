<template>
<div class="tagtl513">
	<header>{{ `#${$route.params.tag}` }}</header>
	<mk-post-form v-if="$store.getters.isSignedIn" class="form" :fixedTag="$route.params.tag"/>
	<mk-notes ref="timeline" :make-promise="makePromise" @inited="inited">
	</mk-notes>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import Progress from '../../../common/scripts/loading';

const limit = 20;

export default Vue.extend({
	i18n: i18n('desktop/views/pages/tag.vue'),
	data() {
		return {
			connection: null,
			makePromise: cursor => this.$root.api('notes/search-by-tag', {
				limit: limit + 1,
				offset: cursor ? cursor : undefined,
				tag: this.$route.params.tag
			}, false, !this.$store.getters.isSignedIn).then(notes => {
				if (notes.length == limit + 1) {
					notes.pop();
					return {
						notes: notes,
						cursor: cursor ? cursor + limit : limit
					};
				} else {
					return {
						notes: notes,
						cursor: null
					};
				}
			})
		};
	},

	created() {
		const prepend = note => {
			(this.$refs.timeline as any).prepend(note);
		};

		this.connection = this.$root.stream.connectToChannel('hashtag', { q: [[this.$route.params.tag]] });
		this.connection.on('note', prepend);
	},

	beforeDestroy() {
		this.connection.dispose();
	},

	watch: {
		$route() {
			this.$refs.timeline.reload();
		}
	},
	mounted() {
		document.addEventListener('keydown', this.onDocumentKeydown);
		window.addEventListener('scroll', this.onScroll, { passive: true });
		Progress.start();
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.onDocumentKeydown);
		window.removeEventListener('scroll', this.onScroll);
	},
	methods: {
		onDocumentKeydown(e) {
			if (e.target.tagName != 'INPUT' && e.target.tagName != 'TEXTAREA') {
				if (e.which == 84) { // t
					(this.$refs.timeline as any).focus();
				}
			}
		},
		inited() {
			Progress.done();
		},
	}
});
</script>

<style lang="stylus" scoped>
.tagtl513
	header
		background var(--face)
		color var(--faceHeaderText)
		border-radius 6px
		padding 0.7em
		margin-bottom 16px
		font-weight bold
		text-align center

	.form
		margin-bottom 16px
		border-radius 6px
		box-shadow 0 3px 8px rgba(0, 0, 0, 0.2)
</style>
