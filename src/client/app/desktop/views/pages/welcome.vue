<template>
<div class="mk-welcome">
	<div class="banner" :style="{ backgroundImage: banner ? `url(${banner})` : null }"></div>

	<button @click="dark">
		<template v-if="$store.state.device.darkmode"><fa icon="moon"/></template>
		<template v-else><fa :icon="['far', 'moon']"/></template>
	</button>

	<main>
		<div class="body">
			<div class="main block">
				<div>
					<h1 v-if="name != 'Misskey'">{{ name }}</h1>
					<h1 v-else><img svg-inline src="../../../../assets/title.svg" :alt="name"></h1>

					<div class="info">
						<span><b>{{ host }}</b> - <span v-html="$t('powered-by-misskey')"></span></span>
						<span class="stats" v-if="stats">
							<span><fa icon="user"/> {{ stats.originalUsersCount | number }}</span>
							<span><fa icon="pencil-alt"/> {{ stats.originalNotesCount | number }}</span>
						</span>
					</div>

					<div class="desc" style="padding-right: 120px">
						<span class="desc" v-html="description || $t('@.about')"></span>
					</div>

					<p class="sign">
						<span class="signup" @click="signup">{{ $t('@.signup') }}</span>
						<span class="divider">|</span>
						<span class="signin" @click="signin">{{ $t('@.signin') }}</span>
						<span class="divider" v-if="meta && !(meta.disableProfileDirectory)">|</span>
						<span class="explore" @click="explore" v-if="meta && !(meta.disableProfileDirectory)">{{ $t('@.explore') }}</span>
					</p>

					<img v-if="meta && meta.mascotImageUrl" :src="meta.mascotImageUrl" alt="" title="藍" class="char">
				</div>
			</div>

			<div class="announcements block">
				<header><fa icon="broadcast-tower"/> {{ $t('announcements') }}</header>
				<div v-if="announcements && announcements.length > 0">
					<div v-for="(announcement, i) in announcements" :key="i">
						<h1 v-html="announcement.title"></h1>
						<div v-html="announcement.text"></div>
					</div>
				</div>
			</div>

			<div class="nav block">
				<div>
					<mk-nav class="nav"/>
				</div>
			</div>

		</div>
	</main>

	<modal name="signup" class="modal" width="450px" height="auto" scrollable>
		<header class="formHeader">{{ $t('@.signup') }}</header>
		<mk-signup class="form"/>
	</modal>

	<modal name="signin" class="modal" width="450px" height="auto" scrollable>
		<header class="formHeader">{{ $t('@.signin') }}</header>
		<mk-signin class="form" @reminder="reminder" />
	</modal>

	<modal name="reminder" class="modal" width="450px" height="auto" scrollable>
		<header class="formHeader">{{ $t('@.reminder') }}</header>
		<mk-reminder class="form" @done="doneReminder" />
	</modal>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { host } from '../../../config';
import { concat } from '../../../../../prelude/array';
import { toUnicode } from 'punycode/';

export default Vue.extend({
	i18n: i18n('desktop/views/pages/welcome.vue'),
	data() {
		return {
			meta: null,
			stats: null,
			banner: null,
			host: toUnicode(host),
			name: 'Misskey',
			description: '',
			announcements: [],
			photos: []
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
		signup() {
			this.$modal.show('signup');
		},

		signin() {
			this.$modal.show('signin');
		},

		reminder() {
			this.$modal.hide('signin');
			this.$modal.show('reminder');
		},

		doneReminder() {
			this.$modal.hide('reminder');
		},

		dark() {
			this.$store.commit('device/set', {
				key: 'darkmode',
				value: !this.$store.state.device.darkmode
			});
		},
		
		explore() {
			this.$router.push(`/explore`);
		},
	}
});
</script>

<style lang="stylus">
#wait
	right auto
	left 15px

.v--modal-overlay
	background rgba(0, 0, 0, 0.6)

.modal
	.form
		padding 24px 48px 48px 48px

	.formHeader
		text-align center
		padding 48px 0 12px 0
		margin 0 48px
		font-size 1.5em

	.v--modal-box
		background var(--bg)
		color var(--text)

		.formHeader
			border-bottom solid 1px rgba(#000, 0.2)

.fpdezooorhntlzyeszemrsqdlgbysvxq
	padding 64px

	> p:last-child
		margin-bottom 0

	> h1
		margin-top 0

	> section
		> h2
			border-bottom 1px solid var(--faceDivider)

		> section
			display grid
			grid-template-rows 1fr
			grid-template-columns 180px 1fr
			gap 32px
			margin-bottom 32px
			padding-bottom 32px
			border-bottom 1px solid var(--faceDivider)

			&:nth-child(odd)
				grid-template-columns 1fr 180px

				> .body
					grid-column 1

				> .image
					grid-column 2

			> .body
				grid-row 1
				grid-column 2

			> .image
				grid-row 1
				grid-column 1

				> img
					display block
					width 100%
					height 100%
					object-fit cover
</style>

<style lang="stylus" scoped>
.mk-welcome
	display flex
	min-height 100vh

	> .banner
		position absolute
		top 0
		left 0
		width 100%
		height 400px
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

	> button
		position fixed
		z-index 1
		bottom 16px
		left 16px
		padding 16px
		font-size 18px
		color var(--text)

	> main
		margin 0 auto
		padding 32px 64px
		width 100%
		max-width 870px

		.block
			color var(--text)
			background var(--face)
			overflow auto
			margin 1em

			> header
				z-index 1
				padding 0 16px
				line-height 48px
				background var(--faceHeader)

				& + div
					max-height calc(100% - 48px)

			> div
				overflow auto

		> .body
			> .main
				border-radius 6px

				> div
					padding 32px
					min-height 390px

					> h1
						margin 0

						> svg
							margin -8px 0 0 -16px
							width 280px
							height 100px
							fill currentColor

					> .info
						margin 0 auto 16px auto
						width $width
						font-size 14px

						> .stats
							margin-left 16px
							padding-left 16px
							border-left solid 1px var(--faceDivider)

							> *
								margin-right 16px

					> .sign
						font-size 120%
						margin-bottom 0

						> .divider
							margin 0 16px

						> .signin
						> .signup
						> .explore
							cursor pointer

							&:hover
								color var(--primary)

					> .char
						display block
						position absolute
						right 16px
						bottom 0
						height 320px
						opacity 0.7

					> *:not(.char)
						z-index 1

			> .announcements
				border-radius 6px
				height 390px

				> div
					padding 32px

					> div
						padding 0 0 16px 0
						margin 0 0 16px 0
						border-bottom 1px solid var(--faceDivider)

						> h1
							margin 0
							font-size 1.25em

			> .nav
				display flex
				justify-content center
				align-items center
				font-size 14px
				border-radius 6px
				margin 1em
				padding 1em
</style>
