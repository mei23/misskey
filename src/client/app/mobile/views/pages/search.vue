<template>
<mk-ui>
	<template #header><fa icon="search"/> {{ q }}</template>

	<main>
		<div class="search-area">
			<x-search-box :word="q"/>
		</div>
		<mk-notes v-if="q !== ''" ref="timeline" :make-promise="q === '' ? () => {} : makePromise" @inited="inited"/>
	</main>
</mk-ui>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import Progress from '../../../common/scripts/loading';
import XSearchBox from '../../../common/views/components/search-box.vue';

const limit = 10;

export default Vue.extend({
	i18n: i18n('mobile/views/pages/search.vue'),
	components: {
		XSearchBox
	},
	data() {
		return {
			makePromise: cursor => this.$root.api('notes/search', {
				limit: limit + 1,
				offset: cursor ? cursor : undefined,
				query: this.q
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
			}).catch((e: any) => {
				this.$notify(e.message || e);
				throw e;
			})
		};
	},
	watch: {
		$route(to) {
			if (to.path.match(/search/)) {
				this.$refs.timeline.reload();
			}
		}
	},
	computed: {
		q(): string {
			return this.$route.query.q || '';
		}
	},
	mounted() {
		document.title = `%i18n:@search%: ${this.q} | ${this.$root.instanceName}`;
	},
	methods: {
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
