<template>
<div style="background: var(--desktopPostFormBg)">
	<div class="mk-post-form"
		@dragover.stop="onDragover"
		@dragenter="onDragenter"
		@dragleave="onDragleave"
		@drop.stop="onDrop"
	>
		<div class="content">
			<div v-if="visibility == 'specified'" class="visibleUsers">
				<span v-for="u in visibleUsers">
					<mk-user-name :user="u"/><a @click="removeVisibleUser(u)">[x]</a>
				</span>
				<a @click="addVisibleUser">{{ $t('add-visible-user') }}</a>
			</div>
			<div class="hashtags" v-if="recentHashtags.length > 0 && $store.state.settings.suggestRecentHashtags && fixedTag == null">
				<a v-for="tag in recentHashtags.slice(0, 5)" @click="addTag(tag)" :key="tag" :title="$t('click-to-tagging')">#{{ tag }}</a>
			</div>
			<div class="local-only-remote" v-if="isUnreachable">ローカルのみでリモートリプライしてもとどきません</div>
			<input v-show="useCw" ref="cw" v-model="cw" @keydown="onKeydown" :placeholder="$t('annotations')" v-autocomplete="{ model: 'cw' }">
			<div class="textarea">
				<textarea :class="{ with: (files.length != 0 || poll) }"
					ref="text" v-model="text" :disabled="posting"
					@keydown="onKeydown" @paste="onPaste" :placeholder="placeholder"
					v-autocomplete="{ model: 'text' }"
				></textarea>
				<button class="emoji" @click="emoji" ref="emoji">
					<fa :icon="['far', 'laugh']"/>
				</button>
				<x-post-form-attaches class="files" :files="files" :detachMediaFn="detachMedia"/>
				<mk-poll-editor v-if="poll" ref="poll" @destroyed="poll = false" @updated="onPollUpdate()" @keydown="onKeydown"/>
			</div>
		</div>
		<mk-uploader ref="uploader" @uploaded="attachMedia" @change="onChangeUploadings"/>
		
		<footer>
			<button class="upload" :title="$t('attach-media-from-local')" @click="chooseFile"><fa icon="upload"/></button>
			<button class="drive" :title="$t('attach-media-from-drive')" @click="chooseFileFromDrive"><fa icon="cloud"/></button>
			<button class="jpeg" :class="{ enabled: useJpeg }" :title="$t('use-jpeg')" @click="useJpeg = !useJpeg"><fa :icon="faShareSquare"/></button>
			<button class="kao" :title="$t('insert-a-kao')" @click="kao"><fa :icon="faFish"/></button>
			<button class="poll" :class="{ enabled: !!poll }" :title="$t('create-poll')" @click="poll = !poll"><fa icon="chart-pie"/></button>
			<button class="cw" :class="{ enabled: useCw }" :title="$t('hide-contents')" @click="useCw = !useCw"><fa :icon="['far', 'eye-slash']"/></button>
			<div class="text-count" :class="{ over: trimmedLength(text) > maxNoteTextLength }">{{ maxNoteTextLength - trimmedLength(text) }}</div>
			<ui-button v-if="tertiaryNoteVisibility != null && tertiaryNoteVisibility != 'none'" inline primary :wait="posting" class="tertiary" :disabled="!canPost" @click="post(tertiaryNoteVisibility)" title="Tertiary Post">
				<mk-ellipsis v-if="posting"/>
				<x-visibility-icon v-else :v="tertiaryNoteVisibility"/>
			</ui-button>
			<ui-button v-if="secondaryNoteVisibility != null && secondaryNoteVisibility != 'none'" inline primary :wait="posting" class="secondary" :disabled="!canPost" @click="post(secondaryNoteVisibility)" title="Secondary Post (Alt+Enter)">
				<mk-ellipsis v-if="posting"/>
				<x-visibility-icon v-else :v="secondaryNoteVisibility"/>
			</ui-button>
			<ui-buttons class="submit">
				<ui-button class="button ok" inline primary :disabled="!canPost" :grow="1" @click="post" title="Post (Ctrl+Enter)">
					<x-visibility-icon class="inline" :v="visibility" :localOnly="localOnly"/>
					{{ submitText }}
				</ui-button>
				<div ref="visibilityButton" :title="$t('visibility')">
					<ui-button class="button ok" inline primary :shrink="1" @click="setVisibility">
						<fa icon="angle-down" fixed-width/>
					</ui-button>
				</div>
			</ui-buttons>
		</footer>

		<input ref="file" type="file" multiple="multiple" tabindex="-1" @change="onChangeFile"/>
		<div class="dropzone" v-if="draghover"></div>
	</div>
	<details v-if="preview" class="preview" ref="preview" :open="$store.state.device.showPostPreview" @toggle="togglePreview">
		<summary>{{ $t('preview') }}</summary>
		<mk-note class="note" :note="preview" :key="preview.id" :compact="true" :preview="true" />
	</details>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import MkVisibilityChooser from '../../../common/views/components/visibility-chooser.vue';
import XPostFormAttaches from '../../../common/views/components/post-form-attaches.vue';
import XVisibilityIcon from '../../../common/views/components/visibility-icon.vue';
import form from '../../../common/scripts/post-form';
import { toASCII } from 'punycode/';
import { extractMentions } from '../../../../../mfm/extract-mentions';
import { parseBasic } from '../../../../../mfm/parse';
import { host } from '../../../config';

export default Vue.extend({
	i18n: i18n('desktop/views/components/post-form.vue'),

	mixins: [
		form({
			onSuccess: self => {
				self.$notify(self.renote
					? self.$t('reposted')
					: self.reply
						? self.$t('replied')
						: self.$t('posted'));
			},
			onFailure: (self: any, e?: any) => {
				let msg = e.message || e;
				if (e?.id === '3d81ceae-475f-4600-b2a8-2bc116157532') {
					msg = `Error in param '${e?.info?.param}'`;
				}

				self.$root.dialog({
					type: 'error',
					text: msg
				});
			}
		}),
	],

	components: {
		MkVisibilityChooser,
		XPostFormAttaches,
		XVisibilityIcon,
	},

	mounted() {
		if (this.initialText) {
			this.text = this.initialText;
		}

		if (this.mention) {
			this.text = this.mention.host ? `@${this.mention.username}@${toASCII(this.mention.host)}` : `@${this.mention.username}`;
			this.text += ' ';
		}

		if (this.reply && this.reply.user.host != null) {
			this.text = `@${this.reply.user.username}@${toASCII(this.reply.user.host)} `;
		}

		if (this.reply && this.reply.text != null) {
			const ast = parseBasic(this.reply.text);

			for (const x of extractMentions(ast)) {
				const mention = x.host ? `@${x.username}@${toASCII(x.host)}` : `@${x.username}`;

				// 自分は除外
				if (this.$store.state.i.username == x.username && x.host == null) continue;
				if (this.$store.state.i.username == x.username && x.host == host) continue;

				// 重複は除外
				if (this.text.indexOf(`${mention} `) != -1) continue;

				this.text += `${mention} `;
			}
		}

		// デフォルト公開範囲
		this.applyVisibilityFromState();

		if (this.reply && this.reply.localOnly) {
			this.localOnly = true;
		}

		// 自分のリモートフォロワーのみ投稿かも
		if (this.reply?.reply?.copyOnce) {
			this.copyOnce = true;
		}

		// 公開以外へのリプライ時は元の公開範囲を引き継ぐ
		if (this.reply && ['home', 'followers', 'specified'].includes(this.reply.visibility)) {
			this.visibility = this.reply.visibility;
			if (this.reply.visibility === 'specified') {
				this.$root.api('users/show', {
					userIds: this.reply.visibleUserIds.filter(uid => uid !== this.$store.state.i.id && uid !== this.reply.userId)
				}).then(users => {
					this.visibleUsers.push(...users);
				});
			}
		}

		if (this.reply && this.reply.userId !== this.$store.state.i.id) {
			this.$root.api('users/show', { userId: this.reply.userId }).then(user => {
				this.visibleUsers.push(user);
			});
		}

		// 空リプ
		if (this.airReply) {
			this.localOnly = this.airReply.user.host == null && this.airReply.visibility === 'public';
			this.visibility = this.airReply.visibility;
			if (this.airReply.user.host != null && this.visibility === 'public') {
				this.visibility = 'home';
			}
		}

		this.$nextTick(() => {
			// 書きかけの投稿を復元
			if (!this.instant && !this.mention) {
				const draft = JSON.parse(localStorage.getItem('drafts') || '{}')[this.draftId];
				if (draft) {
					this.text = draft.data.text;
					this.files = draft.data.files;
					if (draft.data.poll) {
						this.poll = true;
						this.$nextTick(() => {
							(this.$refs.poll as any).set(draft.data.poll);
						});
					}
					this.$emit('change-attached-files', this.files);
				}
			}

			this.$nextTick(() => {
				if (this.initialNote) {
					// 削除して編集
					const init = this.initialNote;
					this.text =
						this.normalizedText(this.initialText) ||
						this.normalizedText(this.text) ||
						this.normalizedText(init.text) || '';
					this.files = init.files;
					this.cw = init.cw;
					this.useCw = init.cw != null;
					if (init.poll) {
						this.poll = true;
						this.$nextTick(() => {
							(this.$refs.poll as any).set({
								choices: init.poll.choices.map(c => c.text),
								multiple: init.poll.multiple
							});
						});
					}
					this.visibility = init.visibility;
					this.localOnly = init.localOnly;
					this.quoteId = init.renote ? init.renote.id : null;
					if (!this.renote) this.renote = this.initialNote.renote;
				}

				this.focus();

				this.$nextTick(() => this.watch());

				const len = this.text.length;
				if (len > 0 && this.$refs.text) (this.$refs.text as HTMLTextAreaElement).setSelectionRange(len, len);
			});
		});
	},

	watch: {
		text() {
			this.triggerPreview();
		},
		files() {
			this.doPreview();
		},
		visibility() {
			this.doPreview();
		},
		localOnly() {
			this.doPreview();
		},
	},
});
</script>

<style lang="stylus" scoped>
.mk-post-form
	display block
	padding 16px
	background var(--desktopPostFormBg)
	overflow hidden

	&:after
		content ""
		display block
		clear both

	> .content
		> input
		> .textarea > textarea
			display block
			width 100%
			padding 12px
			font-size 16px
			color var(--desktopPostFormTextareaFg)
			background var(--desktopPostFormTextareaBg)
			outline none
			border solid 1px var(--primaryAlpha01)
			border-radius 4px
			transition border-color .2s ease
			padding-right 30px

			&:hover
				border-color var(--primaryAlpha02)
				transition border-color .1s ease

			&:focus
				border-color var(--primaryAlpha05)
				transition border-color 0s ease

			&:disabled
				opacity 0.5

			&::-webkit-input-placeholder
				color var(--primaryAlpha03)

		> input
			margin-bottom 8px

		> .textarea
			> .emoji
				position absolute
				top 0
				right 0
				padding 10px
				font-size 18px
				color var(--text)
				opacity 0.5

				&:hover
					color var(--textHighlighted)
					opacity 1

				&:active
					color var(--primary)
					opacity 1

			> textarea
				margin 0
				max-width 100%
				min-width 100%
				min-height 88px

				&:hover
					& + * + *
					& + * + * + *
						border-color var(--primaryAlpha02)
						transition border-color .1s ease

				&:focus
					& + * + *
					& + * + * + *
						border-color var(--primaryAlpha05)
						transition border-color 0s ease

					& + .emoji
						opacity 0.7

				&.with
					border-bottom solid 1px var(--primaryAlpha01) !important
					border-radius 4px 4px 0 0

			> .files
				margin 0
				padding 0
				background var(--desktopPostFormTextareaBg)
				border solid 1px var(--primaryAlpha01)
				border-top none
				border-radius 0 0 4px 4px
				transition border-color .3s ease

				&.with
					border-bottom solid 1px var(--primaryAlpha01) !important
					border-radius 0

				> .remain
					display block
					position absolute
					top 8px
					right 8px
					margin 0
					padding 0
					color var(--primaryAlpha04)

				> div
					padding 4px

					&:after
						content ""
						display block
						clear both

					> div
						float left
						border solid 4px transparent
						cursor move

						> .img
							width 64px
							height 64px
							background-size cover
							background-position center center
							background-color: rgba(128, 128, 128, 0.3)

						> .remove
							position absolute
							top -6px
							right -6px
							width 16px
							height 16px
							cursor pointer

			> .mk-poll-editor
				background var(--desktopPostFormTextareaBg)
				border solid 1px var(--primaryAlpha01)
				border-top none
				border-radius 0 0 4px 4px
				transition border-color .3s ease

		> .visibleUsers
			margin-bottom 8px
			font-size 14px

			> span
				margin-right 16px
				color var(--primary)

		> .hashtags
			max-width 540px
			margin 0 0 8px 0
			padding 2px
			overflow hidden
			white-space nowrap
			font-size 14px

			> *
				margin-right 8px
				padding 3px
				font-size 12px
				white-space nowrap
				background #fff
				color #000
				opacity 0.5
				border solid 1px #333
				border-radius 3px
				text-decoration none

				&:hover
					opacity 0.7

		> .local-only-remote
			margin 0 0 8px 0
			color var(--primary)

	> .mk-uploader
		margin 8px 0 0 0
		padding 8px
		border solid 1px var(--primaryAlpha02)
		border-radius 4px

	input[type='file']
		display none

	footer
		display flex
		align-items: center;
		margin-top: 6px

		> .submit
			flex 0 0 auto
			margin 4px

			.inline
				display inline

		> .secondary, .tertiary
			display block
			margin 4px
			min-width 50px !important

		> .text-count
			pointer-events none
			line-height 40px
			color var(--primaryAlpha05)
			margin 4px 4px 4px auto

			&.over
				color #ec3828

		> .upload
		> .drive
		> .jpeg
		> .kao
		> .poll
		> .cw
		> .geo
		> .visibility
			display block
			cursor pointer
			width 40px
			height 40px
			font-size 1em
			color var(--text)
			background transparent
			outline none
			border solid 1px transparent
			border-radius 4px
			opacity 0.7

			&.enabled
				color var(--primary)
				opacity 1

			&:hover
				opacity 1

			&:focus
				&:after
					content ""
					pointer-events none
					position absolute
					top -5px
					right -5px
					bottom -5px
					left -5px
					border 2px solid var(--primaryAlpha03)
					border-radius 8px

	> .dropzone
		position absolute
		left 0
		top 0
		width 100%
		height 100%
		border dashed 2px var(--primaryAlpha05)
		pointer-events none

.preview
	max-width 570px
	background var(--desktopPostFormBg)

	> summary
		padding 0px 16px 16px 20px
		font-size 14px
		color var(--text)
</style>
