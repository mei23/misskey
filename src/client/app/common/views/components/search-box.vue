<template>
<form class="serchbox24" @submit.prevent="onSubmit">
	<div class="line">
		<input v-model="q" type="search" :placeholder="$t('placeholder')" v-autocomplete="{ model: 'q', noEmoji: true }"/>
		<button type="submit"><fa icon="search"/></button>
	</div>
	<div class="result"></div>
</form>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';

export default Vue.extend({
	i18n: i18n('desktop/views/components/ui.header.search.vue'),
	props: {
		word: {
			type: String
		},
	},
	data() {
		return {
			q: this.word,
			wait: false
		};
	},
	methods: {
		async onSubmit() {
			if (this.wait) return;

			const q = this.q.trim();
			if (q.startsWith('@')) {
				this.$router.push(`/${q}`);
			} else if (q.startsWith('#')) {
				this.$router.push(`/tags/${encodeURIComponent(q.substr(1))}`);
			} else if (q.startsWith('https://')) {
				this.wait = true;
				try {
					const res = await this.$root.api('ap/show', {
						uri: q
					});
					if (res.type == 'User') {
						this.$router.push(`/@${res.object.username}${ res.object.host ? `@${res.object.host}` : '' }`);
					} else if (res.type == 'Note') {
						this.$router.push(`/notes/${res.object.id}`);
					} else if (res.type == 'Emoji') {
						this.$root.dialog({
							type: 'success',
							text: `:${res.object.name}:`,
							mfmCustomEmojis: [ res.object ]
						});
					}
				} catch (e) {
					// TODO
				}
				this.wait = false;
			} else {
				this.$router.push(`/search?q=${encodeURIComponent(q)}`);
			}
		}
	}
});
</script>

<style lang="stylus" scoped>
.serchbox24
	> .line
		display flex

		> input
			width 100%
			height 2em
			font-size 1em
			padding 0.5em
			background var(--desktopHeaderSearchBg)
			border none
			border-radius 8px
			transition color 0.5s ease, border 0.5s ease, width 0.5s ease, background 0.5s ease
			color var(--desktopHeaderSearchFg)

			&::placeholder
				color var(--desktopHeaderFg)

			&:hover
				background var(--desktopHeaderSearchHoverBg)

			&:focus
				box-shadow 0 0 0 2px var(--primaryAlpha05) !important
				background var(--bg)

		> button
			color var(--text)
			margin 6px
</style>
