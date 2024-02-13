<template>
<span class="mk-nav">
	<a :href="aboutUrl">{{ $t('about') }}</a>
	<i>・</i>
	<router-link to="/about">{{ $t('@.aboutInstance') }}</router-link>
	<i>・</i>
	<a :href="repositoryUrl" rel="noopener" target="_blank">{{ $t('repository') }}</a>
	<span v-if="commitLabal != null"> (<a v-if="commitUrl != null" :href="commitUrl" rel="noopener" target="_blank">{{ commitLabal }}</a><span v-else >{{ commitLabal }}</span>) </span>
	<i>・</i>
	<a :href="feedbackUrl" rel="noopener" target="_blank">{{ $t('feedback') }}</a>
	<i>・</i>
	<a href="/dev">{{ $t('develop') }}</a>
</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import i18n from '../../../i18n';
import { constants, commit } from '../../../config';

export default defineComponent({
	i18n: i18n('common/views/components/nav.vue'),
	data() {
		return {
			aboutUrl: `/docs/ja-JP/about`,
			repositoryUrl: constants.repositoryUrl,
			feedbackUrl: constants.feedbackUrl,
			commitLabal: null as string | null,
			commitUrl: null as string | null,
		}
	},

	mounted() {
		this.commitLabal = commit.tag || commit.id?.substring(0, 7) || null;

		// find commitUrlBase
		let commitUrlBase: string | null = null;

		if (typeof this.repositoryUrl === 'string') {
			try {
				const u = new URL(this.repositoryUrl);
				if (u.hostname === 'github.com') {
					const m = u.pathname.match(/([/][^/]+[/][^/]+)/)	// eg: /user/repo
					if (m) {
						commitUrlBase = `https://github.com/${m[1]}`;	// eg: https://github.com/user/repo
					}
				}
			} catch { }
		}

		// build commitUrl
		if (commitUrlBase != null) {
			this.commitUrl =
				commit.tag ? `${commitUrlBase}/tree/${commit.tag}` :
				commit.id ? `${commitUrlBase}/tree/${commit.id}` :
				null;
		}
	},

});
</script>

<style lang="stylus" scoped>
.mk-nav
	a
		color inherit
</style>
