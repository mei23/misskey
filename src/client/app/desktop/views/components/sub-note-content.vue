<template>
<div class="mk-sub-note-content">
	<div class="body">
		<span v-if="note.isHidden" style="opacity: 0.5">{{ $t('private') }}</span>
		<span v-if="note.deletedAt" style="opacity: 0.5">{{ $t('deleted') }}</span>
		<a class="reply" v-if="note.replyId"><fa icon="reply"/></a>
		<mfm v-if="note.text" :text="note.text" :author="note.user" :i="$store.state.i" :custom-emojis="note.emojis" :hashtags="note.tags" :basic="!!note.notHaveDecorationMfm"/>
		<router-link class="rp" v-if="note.renoteId" :to="`/notes/${note.renoteId}`">RN: ...</router-link>
	</div>
	<details v-if="note.files.length > 0" :open="note.cw != null">
		<summary>({{ this.$t('media-count').replace('{}', note.files.length) }})</summary>
		<mk-media-list :media-list="note.files" :hide="!$store.state.device.alwaysShowNsfw && note.cw == null"/>
	</details>
	<details v-if="note.poll">
		<summary>{{ $t('poll') }}</summary>
		<mk-poll :note="note"/>
	</details>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';

export default Vue.extend({
	i18n: i18n('desktop/views/components/sub-note-content.vue'),
	props: ['note']
});
</script>

<style lang="stylus" scoped>
.mk-sub-note-content
	overflow-wrap break-word

	> .body
		> .reply
			margin-right 6px
			color #717171

		> .rp
			margin-left 4px
			font-style oblique
			color var(--renoteText)

	mk-poll
		font-size 80%

</style>
