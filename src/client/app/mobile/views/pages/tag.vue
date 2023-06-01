<template>
<mk-ui>
	<template #header><span style="margin-right:4px;"><fa icon="hashtag"/></span>{{ $route.params.tag }}</template>

	<template #func>
		<button @click="fn"><fa icon="pencil-alt"/></button>
	</template>

	<main>
		<div class="search-area">
			<x-search-box :word="`#${$route.params.tag}`"/>
		</div>
		<mk-post-form v-if="$store.getters.isSignedIn" class="form" :fixedTag="$route.params.tag"/>
		<mk-notes ref="timeline" :make-promise="makePromise" @inited="inited"/>
	</main>
</mk-ui>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import Progress from '../../../common/scripts/loading';
import XSearchBox from '../../../common/views/components/search-box.vue';

const limit = 20;

export default Vue.extend({
	i18n: i18n('mobile/views/pages/tag.vue'),
	components: {
		XSearchBox
	},
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
	methods: {
		fn() {
			this.$post();
		},

		inited() {
			Progress.done();
		},
	}
});
</script>

<style lang="stylus" scoped>
	.search-area
		padding 0 10%
		margin-bottom 24px
</style>
