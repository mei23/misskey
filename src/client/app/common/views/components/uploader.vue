<template>
<div class="mk-uploader">
	<ol v-if="uploads.length > 0">
		<li v-for="ctx in uploads" :key="ctx.id">
			<div class="img" :style="{ backgroundImage: `url(${ ctx.img })` }"></div>
			<div class="top">
				<p class="name"><fa icon="spinner" pulse/>{{ ctx.name }}</p>
				<p class="status">
					<span class="initing" v-if="ctx.progressValue === undefined">{{ $t('waiting') }}<mk-ellipsis/></span>
					<span class="kb" v-if="ctx.progressValue !== undefined">{{ String(Math.floor(ctx.progressValue / 1024)).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,') }}<i>KB</i> / {{ String(Math.floor(ctx.progressMax / 1024)).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,') }}<i>KB</i></span>
					<span class="percentage" v-if="ctx.progressValue !== undefined">{{ Math.floor((ctx.progressValue / ctx.progressMax) * 100) }}</span>
				</p>
			</div>
			<progress v-if="ctx.progressValue !== undefined && ctx.progressValue !== ctx.progressMax" :value="ctx.progressValue" :max="ctx.progressMax"></progress>
			<div class="progress initing" v-if="ctx.progressValue === undefined"></div>
			<div class="progress waiting" v-if="ctx.progressValue !== undefined && ctx.progressValue === ctx.progressMax"></div>
		</li>
	</ol>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { apiUrl } from '../../../config';
import { readAndCompressImage } from 'browser-image-resizer';

export default Vue.extend({
	i18n: i18n('common/views/components/uploader.vue'),
	data() {
		return {
			uploads: []
		};
	},
	methods: {
		async upload(file: File, folder: any, name?: string, useJpeg = false, clientResize = false) {
			if (folder && typeof folder == 'object') folder = folder.id;
			const id = Math.random();
			name = name || file.name || 'untitled';

			let resizedImage: any;
			if ((file.type === 'image/jpeg' && clientResize && !this.$store.state.settings.disableClientImageResizing) || (useJpeg && file.type === 'image/png')) {
				const config = {
					quality: 0.85,
					maxWidth: 2048,
					maxHeight: 2048,
					autoRotate: true,
					debug: true
				};
				resizedImage = await readAndCompressImage(file, config)

				name = name.replace(/\.png/, '.jpg');
			}

			const ctx = {
				id,
				name,
				progressMax: undefined,
				progressValue: undefined,
				img: window.URL.createObjectURL(file)
			};

			this.uploads.push(ctx);
			this.$emit('change', this.uploads);

			const data = new FormData();
			data.append('i', this.$store.state.i.token);
			data.append('force', 'true');
			data.append('isWebpublic', `${!!resizedImage}`);
			data.append('file', resizedImage || file);

			if (folder) data.append('folderId', folder);
			if (name) data.append('name', name);

			const xhr = new XMLHttpRequest();
			xhr.open('POST', apiUrl + '/drive/files/create', true);
			xhr.onload = (e: any) => {
				const driveFile = JSON.parse(e.target.response);

				this.$emit('uploaded', driveFile);

				this.uploads = this.uploads.filter(x => x.id != id);
				this.$emit('change', this.uploads);
			};

			xhr.upload.onprogress = e => {
				if (e.lengthComputable) {
					ctx.progressMax = e.total;
					ctx.progressValue = e.loaded;
				}
			};

			xhr.send(data);


		}
	}
});
</script>

<style lang="stylus" scoped>
.mk-uploader
	overflow auto

	&:empty
		display none

	> ol
		display block
		margin 0
		padding 0
		list-style none

		> li
			display grid
			margin 8px 0 0 0
			padding 0
			height 36px
			width: 100%
			box-shadow 0 -1px 0 var(--primaryAlpha01)
			border-top solid 8px transparent
			grid-template-columns 36px calc(100% - 44px)
			grid-template-rows 1fr 8px
			column-gap 8px
			box-sizing content-box

			&:first-child
				margin 0
				box-shadow none
				border-top none

			> .img
				display block
				background-size cover
				background-position center center
				grid-column 1 / 2
				grid-row 1 / 3

			> .top
				display flex
				grid-column 2 / 3
				grid-row 1 / 2

				> .name
					display block
					padding 0 8px 0 0
					margin 0
					font-size 0.8em
					color var(--primaryAlpha07)
					white-space nowrap
					text-overflow ellipsis
					overflow hidden
					flex-shrink 1

					> [data-icon]
						margin-right 4px

				> .status
					display block
					margin 0 0 0 auto
					padding 0
					font-size 0.8em
					flex-shrink 0

					> .initing
						color var(--primaryAlpha05)

					> .kb
						color var(--primaryAlpha05)

					> .percentage
						display inline-block
						width 48px
						text-align right

						color var(--primaryAlpha07)

						&:after
							content '%'

			> progress
				display block
				background transparent
				border none
				border-radius 4px
				overflow hidden
				grid-column 2 / 3
				grid-row 2 / 3
				z-index 2

				&::-webkit-progress-value
					background var(--primary)

				&::-webkit-progress-bar
					background var(--primaryAlpha01)

			> .progress
				display block
				border none
				border-radius 4px
				background linear-gradient(
					45deg,
					var(--primaryLighten30) 25%,
					var(--primary)               25%,
					var(--primary)               50%,
					var(--primaryLighten30) 50%,
					var(--primaryLighten30) 75%,
					var(--primary)               75%,
					var(--primary)
				)
				background-size 32px 32px
				animation bg 1.5s linear infinite
				grid-column 2 / 3
				grid-row 2 / 3
				z-index 1

				&.initing
					opacity 0.3

				@keyframes bg
					from {background-position: 0 0;}
					to   {background-position: -64px 32px;}

</style>
