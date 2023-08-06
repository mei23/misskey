<template>
<div class="wgwfgvvimdjvhjfwxropcwksnzftjqes">
	<div class="banner" :style="{ backgroundImage: banner ? `url(${banner})` : null }"></div>

	<div>
		<div class="about">
			<h2>{{ name }}</h2>
			<small>{{ host }}</small>
			<p v-html="description || this.$t('@.about')"></p>
			<router-link class="signup" to="/signup">{{ $t('@.signup') }}</router-link>
			<div class="signin">
				<a href="/signin" @click.prevent="signin()">{{ $t('@.signin') }}</a>
			</div>
			<div class="explore" v-if="meta && !(meta.disableProfileDirectory)">
				<router-link class="explore" to="/explore">{{ $t('@.explore') }}</router-link>
			</div>
		</div>
		<div class="announcements" v-if="announcements && announcements.length > 0">
			<article v-for="(announcement, i) in announcements" :key="i">
				<span class="title" v-html="announcement.title"></span>
				<div v-html="announcement.text"></div>
			</article>
		</div>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { host } from '../../../config';
import { concat } from '../../../../../prelude/array';
import { toUnicode } from 'punycode/';

export default Vue.extend({
	i18n: i18n('mobile/views/pages/welcome.vue'),
	data() {
		return {
			meta: null,
			stats: null,
			banner: null,
			host: toUnicode(host),
			name: 'Misskey',
			description: '',
			photos: [],
			announcements: []
		};
	},
	created() {
		this.$root.getMeta().then((meta: any) => {
			this.meta = meta;
			this.name = meta.name;
			this.description = meta.description;
			this.announcements = meta.announcements;
			this.banner = meta.bannerUrl;
		});

		this.$root.api('stats', {}, false, true).then((stats: any) => {
			this.stats = stats;
		});

		const image = ['image/jpeg','image/png','image/apng','image/gif','image/webp', 'image/avif'];

		this.$root.api('notes/featured', {
			fileType: image,
			limit: 6,
			excludeNsfw: true,
		}, false, true).then((notes: any[]) => {
			const files = concat(notes.map((n: any): any[] => n.files));
			this.photos = files.filter(f => image.includes(f.type)).slice(0, 6);
		});
	},
	methods: {
		signin() {
			this.$root.dialog({
				type: 'signin'
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.wgwfgvvimdjvhjfwxropcwksnzftjqes
	text-align center

	> .banner
		position absolute
		top 0
		left 0
		width 100%
		height 300px
		background-position center
		background-size cover
		opacity 0.7

		&:after
			content ""
			display block
			position absolute
			bottom 0
			left 0
			width 100%
			height 100px
			background linear-gradient(transparent, var(--bg))

	> div:not(.banner)
		padding 32px
		margin 0 auto
		max-width 500px

		> .about
			margin-top 16px
			padding 16px
			color var(--text)
			background var(--face)
			border-radius 6px

			> h2
				margin 0

			> small
				opacity 0.7

			> p
				margin 8px

			> .signup
			> .signin
			> .explore
				margin 0.5em

		> .announcements
			margin 16px 0

			> article
				background var(--mobileAnnouncement)
				border-radius 6px
				color var(--mobileAnnouncementFg)
				padding 16px
				margin 8px 0
				font-size 12px

				> .title
					font-weight bold

		> .about-misskey
			margin 16px 0
			padding 32px
			font-size 14px
			background var(--face)
			border-radius 6px
			overflow hidden
			color var(--text)

			> h1
				margin 0

				& + p
					margin-top 8px

			> p:last-child
				margin-bottom 0

			> section
				> h2
					border-bottom 1px solid var(--faceDivider)

				> section
					margin-bottom 16px
					padding-bottom 16px
					border-bottom 1px solid var(--faceDivider)

					> h3
						margin-bottom 8px

					> p
						margin-bottom 0

					> .image
						> img
							display block
							width 100%
							height 120px
							object-fit cover

		> footer
			text-align center
			color var(--text)

			> small
				display block
				margin 16px 0 0 0
				opacity 0.7

</style>
