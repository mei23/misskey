<template>
<div class="mk-post-form">
	<div class="form">
		<header v-if="!inside">
			<button class="cancel" @click="cancel"><fa icon="times"/></button>
			<div>
				<span v-if="!renote || quote" class="text-count" :class="{ over: trimmedLength(text) > maxNoteTextLength }">{{ maxNoteTextLength - trimmedLength(text) }}</span>
				<span class="geo" v-if="geo"><fa icon="map-marker-alt"/></span>
				<button v-if="tertiaryNoteVisibility != null && tertiaryNoteVisibility != 'none'" class="tertiary" :disabled="!canPost" @click="post(tertiaryNoteVisibility)">
					<x-visibility-icon :v="tertiaryNoteVisibility"/>
				</button>
				<button v-if="secondaryNoteVisibility != null && secondaryNoteVisibility != 'none'" class="secondary" :disabled="!canPost" @click="post(secondaryNoteVisibility)">
					<x-visibility-icon :v="secondaryNoteVisibility"/>
				</button>
			</div>
		</header>
		<div class="form">
			<mk-note-preview class="preview" v-if="reply" :note="reply"/>
			<mk-note-preview class="preview" v-if="renote" :note="renote"/>
			<div v-if="visibility == 'specified'" class="visibleUsers">
				<span v-for="u in visibleUsers">
					<mk-user-name :user="u"/>
					<a @click="removeVisibleUser(u)">[x]</a>
				</span>
				<a @click="addVisibleUser">+{{ $t('add-visible-user') }}</a>
			</div>
			<input v-show="useCw" ref="cw" v-model="cw" :placeholder="$t('annotations')" v-autocomplete="{ model: 'cw' }">
			<div class="textarea">
				<textarea v-if="!renote || quote" v-model="text" ref="text" :disabled="posting" :placeholder="placeholder" v-autocomplete="{ model: 'text' }"></textarea>
				<button class="emoji" @click="emoji" ref="emoji">
					<fa :icon="['far', 'laugh']"/>
				</button>
			</div>
			<x-post-form-attaches class="attaches" :files="files"/>
			<mk-poll-editor v-if="poll" ref="poll" @destroyed="poll = false" @updated="onPollUpdate()"/>
			<mk-uploader ref="uploader" @uploaded="attachMedia" @change="onChangeUploadings"/>
			<footer v-if="!renote || quote">
				<button class="upload" @click="chooseFile"><fa icon="upload"/></button>
				<button class="drive" @click="chooseFileFromDrive"><fa icon="cloud"/></button>
				<button class="jpeg" :class="{ enabled: useJpeg }" @click="useJpeg = !useJpeg"><fa :icon="faShareSquare"/></button>
				<button class="kao" @click="kao"><fa :icon="faFish"/></button>
				<button v-if="!inside" class="poll" :class="{ enabled: !!poll }" @click="poll = !poll"><fa icon="chart-pie"/></button>
				<button class="cw" :class="{ enabled: useCw }" @click="useCw = !useCw"><fa :icon="['far', 'eye-slash']"/></button>
				<button class="visibility" @click="setVisibility" ref="visibilityButton">
					<x-visibility-icon :v="visibility" :localOnly="localOnly" :copyOnce="copyOnce"/>
				</button>
				<ui-button class="submit" :disabled="!canPost" @click="post()">
					<div style="display: inline-flex; gap: 4px">
						<x-visibility-icon v-if="!(this.renote && !this.text.length && !this.files.length && !this.poll)" :v="visibility" :localOnly="localOnly" :copyOnce="copyOnce"/>
						<div>{{ submitText }}</div>
					</div>
				</ui-button>
			</footer>
			<footer v-else>
				<a class="quote" @click="quote = true">{{ $t('quote') }}</a>
			</footer>
			<input ref="file" class="file" type="file" multiple="multiple" @change="onChangeFile"/>
		</div>
		<details v-if="!inside && preview" class="preview" ref="preview" :open="$store.state.device.showPostPreview" @toggle="togglePreview">
			<summary>{{ $t('preview') }}</summary>
			<mk-note class="note" :note="preview" :key="preview.id" :compact="true" :preview="true" />
		</details>
	</div>
	<div class="hashtags" v-if="!inside && recentHashtags.length > 0 && $store.state.settings.suggestRecentHashtags">
		<a v-for="tag in recentHashtags.slice(0, 5)" :key="tag" @click="addTag(tag)">#{{ tag }}</a>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { parseBasic } from '../../../../../mfm/parse';
import { host } from '../../../config';
import { toASCII } from 'punycode';
import extractMentions from '../../../../../misc/extract-mentions';
import XPostFormAttaches from '../../../common/views/components/post-form-attaches.vue';
import XVisibilityIcon from '../../../common/views/components/visibility-icon.vue';
import form from '../../../common/scripts/post-form';

export default Vue.extend({
	i18n: i18n('mobile/views/components/post-form.vue'),

	mixins: [
		form({
			mobile: true,
			onFailure: (self: any, e?: any) => {
				let msg = e.message || e;
				if (e?.id === '3d81ceae-475f-4600-b2a8-2bc116157532') {
					msg = `Error in param '${e?.info?.param}'`;
				}
				self.$notify(msg)
			}
		}),
	],

	components: {
		XPostFormAttaches,
		XVisibilityIcon,
	},

	props: {
		inside: {
			type: Boolean,
			required: false,
			default: false
		},
		quote: {
			type: Boolean,
			required: false,
			default: true
		},
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

	mounted() {
		if (this.initialText) {
			this.text = this.initialText;
		}

		if (this.reply && this.reply.user.host != null) {
			this.text = `@${this.reply.user.username}@${toASCII(this.reply.user.host)} `;
		}

		if (this.mention) {
			this.text = this.mention.host ? `@${this.mention.username}@${toASCII(this.mention.host)}` : `@${this.mention.username}`;
			this.text += ' ';
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
				this.quote = true;
			}

			if (!this.inside) {
				this.$nextTick(this.focus);
			}

			const len = this.text.length;
			if (len > 0 && this.$refs.text) (this.$refs.text as HTMLTextAreaElement).setSelectionRange(len, len);
		});
	},

	methods: {
		cancel() {
			this.$emit('cancel');
		},
	}
});
</script>

<style lang="stylus" scoped>
.mk-post-form
	max-width 500px
	width calc(100% - 16px)
	margin 8px auto

	@media (min-width 500px)
		margin 16px auto
		width calc(100% - 32px)

		> .form
			box-shadow 0 8px 32px rgba(#000, 0.1)

	@media (min-width 600px)
		margin 32px auto

	> .form
		background var(--bg)
		border-radius 8px
		box-shadow 0 0 2px rgba(#000, 0.1)

		> header
			z-index 1000
			height 50px
			box-shadow 0 1px 0 0 var(--mobilePostFormDivider)

			> .cancel
				padding 0
				width 50px
				line-height 50px
				font-size 24px
				color var(--text)

			> div
				position absolute
				top 0
				right 0
				color var(--text)

				> .text-count
					line-height 50px
					margin-right 6px

				> .geo
					margin 0 8px
					line-height 50px

				> .secondary, .tertiary
					margin 8px 6px
					padding 0 16px
					line-height 34px
					vertical-align bottom
					color var(--text)
					background var(--buttonBg)
					border-radius 4px

					&:disabled
						opacity 0.7

		> .form
			max-width 500px
			margin 0 auto

			>.textarea
				> textarea
					display block
					padding 12px
					padding-right 32px
					margin 0
					width 100%
					font-size 16px
					color var(--inputText)
					background var(--mobilePostFormTextareaBg)
					border none
					border-radius 0
					box-shadow 0 1px 0 0 var(--mobilePostFormDivider)
					max-width 100%
					min-width 100%
					min-height 80px

				> .emoji
					position absolute
					top 0
					right 0
					padding 10px
					font-size 18px
					color var(--text)
					opacity 0.5

			> .preview
				padding 16px

			> .visibleUsers
				margin 5px
				font-size 14px

				> span
					margin-right 16px
					color var(--text)

			> input
				z-index 1

			> input
				display block
				padding 12px
				margin 0
				width 100%
				font-size 16px
				color var(--inputText)
				background var(--mobilePostFormTextareaBg)
				border none
				border-radius 0
				box-shadow 0 1px 0 0 var(--mobilePostFormDivider)

				&:disabled
					opacity 0.5

			> textarea
				max-width 100%
				min-width 100%
				min-height 60px

			> .mk-uploader
				margin 8px 0 0 0
				padding 8px

			> .file
				display none

			> footer
				display flex
				align-items center
				white-space nowrap
				overflow auto
				-webkit-overflow-scrolling touch
				overflow-scrolling touch

				> *
					display inline-block
					padding 0
					margin 0
					width 48px
					height 48px
					font-size 20px
					color var(--mobilePostFormButton)
					background transparent
					outline none
					border none
					border-radius 0
					box-shadow none
					opacity 0.7

				> .jpeg
				> .poll
				> .cw
					&.enabled
						color var(--primary)
						opacity 1

				> .visibility > .localOnly
					color var(--primary)
					position absolute
					top 0
					right 0.2em
					transform scale(.8)

				> .quote
					display block
					margin-right auto
					margin-left 8px
					color var(--link)

				> .submit
					height 36px
					margin 8px 6px
					padding 0 8px
					margin-left auto
					line-height 34px
					min-width 80px
					vertical-align bottom
					color var(--primaryForeground)
					background var(--primary)
					border-radius 4px
					font-size 14px
					opacity 1.0

					&:disabled
						opacity 0.7

		> .preview
			> summary
				padding 12px
				font-size 14px
				color var(--text)

			> .note
				border-top solid var(--lineWidth) var(--faceDivider)

	> .hashtags
		margin 8px

		> *
			display inline-block
			margin-right 6px
			margin-bottom 6px
			padding 3px
			font-size 12px
			line-height 16px
			background #fff
			color #000
			opacity 0.5
			border solid 1px #333
			border-radius 3px
			text-decoration none

			&:hover
				opacity 0.7

</style>
