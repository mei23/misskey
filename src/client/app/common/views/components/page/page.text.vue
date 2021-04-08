<template>
<div class="mrdgzndn">
	<mfm :text="text" :i="$store.state.i" :key="text"/>

	<mk-url-preview v-for="url in urls" :url="url" :key="url" class="url"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { parseBasic } from '../../../../../../mfm/parse';
import { unique } from '../../../../../../prelude/array';

export default Vue.extend({
	props: {
		value: {
			required: true
		},
		script: {
			required: true
		}
	},

	data() {
		return {
			text: this.script.interpolate(this.value.text),
		};
	},

	computed: {
		urls(): string[] {
			if (this.text) {
				const ast = parseBasic(this.text);
				return unique(ast
					.filter(node => ((node.type == 'url' || node.type == 'link') && node.props.url && !node.props.silent))
					.map(node => node.props.url));
			} else {
				return [];
			}
		}
	},

	created() {
		this.$watch('script.vars', () => {
			this.text = this.script.interpolate(this.value.text);
		}, { deep: true });
	}
});
</script>

<style lang="stylus" scoped>
.mrdgzndn
	&:not(:first-child)
		margin-top 0.5em

	&:not(:last-child)
		margin-bottom 0.5em

	> .url
		margin 0.5em 0
</style>
