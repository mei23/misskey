<template>
<a class="mk-url" :href="url" :rel="rel" :target="target" :title="title">
	<span class="schema" v-if="!trim">{{ schema }}//</span>
	<span class="hostname">{{ hostname }}</span>
	<span class="port" v-if="port != ''">:{{ port }}</span>
	<span class="pathname" v-if="pathname != ''">{{ pathname }}</span>
	<span class="query">{{ query }}</span>
	<span class="hash">{{ hash }}</span>
	<fa icon="external-link-square-alt"/>
</a>
</template>

<script lang="ts">
import Vue from 'vue';
import { toUnicode as decodePunycode } from 'punycode/';

function safeURIDecode(str: string) {
	try {
		return decodeURIComponent(str);
	} catch {
		return str;
	}
}

export default Vue.extend({
	props: ['url', 'rel', 'target', 'trim'],
	data() {
		return {
			schema: null,
			hostname: null,
			port: null,
			pathname: null,
			query: null,
			hash: null,
			title: null
		};
	},
	created() {
		const url = new URL(this.url);
		this.schema = url.protocol;
		this.hostname = decodePunycode(url.hostname);
		this.port = url.port;
		this.pathname = safeURIDecode(url.pathname);
		this.query = safeURIDecode(url.search);
		this.hash = safeURIDecode(url.hash);

		this.title = this.schema + '//'
			+ this.hostname
			+ (this.port != '' ? ':' + this.port : '')
			+ this.pathname
			+ this.query
			+ this.hash;

		if (this.trim) {
			let postfix = this.pathname + this.query + this.hash;
			if (postfix.length > 16) postfix = postfix.slice(0, 16) + '…';
			if (postfix == '/') postfix = '';

			this.pathname = postfix;
			this.query = '';
			this.hash = '';
		}
	}
});
</script>

<style lang="stylus" scoped>
.mk-url
	word-break break-all
	> [data-icon]
		padding-left 2px
		font-size .9em
		font-weight 400
		font-style normal
	> .schema
		opacity 0.5
	> .hostname
		font-weight bold
	> .pathname
		opacity 0.8
	> .query
		opacity 0.5
	> .hash
		font-style italic
</style>
