<template>
<div class="qjewsnkgzzxlxtzncydssfbgjibiehcy" v-if="image.isSensitive && hide" @click="hide = false">
	<div>
		<b><fa icon="exclamation-triangle"/> {{ $t('sensitive') }}</b>
		<span>{{ $t('click-to-show') }}</span>
	</div>
</div>
<a class="gqnyydlzavusgskkfvwvjiattxdzsqlf" v-else
	:href="image.url"
	:style="style"
	:title="imageInfo"
	@click.prevent="onClick"
>
</a>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { getStaticImageUrl } from '../../../common/scripts/get-static-image-url';

export default Vue.extend({
	i18n: i18n('common/views/components/media-image.vue'),
	props: {
		image: {
			type: Object,
			required: true
		},
		hide: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	computed: {
		style(): any {
			let url = `url(${
				this.$store.state.device.disableShowingAnimatedImages
					? getStaticImageUrl(this.image.thumbnailUrl, this.image.type, this.image.animation)
					: this.image.thumbnailUrl
			})`;

			return {
				'background-color': `var(--face)`,
				'background-image': url
			};
		},
		imageInfo(): string {
			return `${this.image.name}`;
		},
	},
	methods: {
		onClick() {
			this.$emit('imageClick');
		}
	}
});
</script>

<style lang="stylus" scoped>
.gqnyydlzavusgskkfvwvjiattxdzsqlf
	display block
	cursor zoom-in
	overflow hidden
	width 100%
	height 100%
	background-position center
	background-size contain
	background-repeat no-repeat

.qjewsnkgzzxlxtzncydssfbgjibiehcy
	display flex
	justify-content center
	align-items center
	background #111
	color #fff

	> div
		display table-cell
		text-align center
		font-size 12px

		> *
			display block

</style>
