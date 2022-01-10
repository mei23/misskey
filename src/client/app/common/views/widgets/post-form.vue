<template>
<div>
	<ui-container :show-header="props.design == 0">
		<template #header><fa icon="pencil-alt"/>{{ $t('title') }}</template>

		<div class="lhcuptdmcdkfwmipgazeawoiuxpzaclc-body"
			@dragover.stop="onDragover"
			@drop.stop="onDrop"
		>
			<div class="textarea">
				<textarea
					:disabled="posting"
					v-model="text"
					@keydown="onKeydown"
					@paste="onPaste"
					:placeholder="placeholder"
					ref="text"
					v-autocomplete="{ model: 'text' }"
				></textarea>
				<button class="emoji" @click="emoji" ref="emoji" v-if="!$root.isMobile">
					<fa :icon="['far', 'laugh']"/>
				</button>
			</div>
			<x-post-form-attaches class="files" :files="files" :detachMediaFn="detachMedia"/>
			<input ref="file" type="file" multiple="multiple" tabindex="-1" @change="onChangeFile"/>
			<mk-uploader ref="uploader" @uploaded="attachMedia"/>
			<footer>
				<button @click="chooseFile"><fa icon="upload"/></button>
				<button @click="chooseFileFromDrive"><fa icon="cloud"/></button>
				<button @click="kao"><fa :icon="faFish"/></button>
				<button @click="setVisibility" class="visibility" ref="visibilityButton">
					<x-visibility-icon :v="visibility" :localOnly="localOnly" :copyOnce="copyOnce"/>
				</button>
				<button v-if="tertiaryNoteVisibility != null && tertiaryNoteVisibility != 'none'" @click="post(tertiaryNoteVisibility)" :disabled="posting" class="tertiary" title="Tertiary Post">
					<x-visibility-icon :v="tertiaryNoteVisibility"/>
				</button>
				<button v-if="secondaryNoteVisibility != null && secondaryNoteVisibility != 'none'" @click="post(secondaryNoteVisibility)" :disabled="posting" class="secondary" title="Secondary Post (Alt+Enter)">
					<x-visibility-icon :v="secondaryNoteVisibility"/>
				</button>
				<button @click="post()" :disabled="posting" class="post" title="Post (Ctrl+Enter)">{{ $t('note') }}</button>
			</footer>
		</div>
	</ui-container>
</div>
</template>

<script lang="ts">
import define from '../../../common/define-widget';
import i18n from '../../../i18n';
import insertTextAtCursor from 'insert-text-at-cursor';
import getFace from '../../../common/scripts/get-face';
import MkVisibilityChooser from '../../../common/views/components/visibility-chooser.vue';
import XPostFormAttaches from '../components/post-form-attaches.vue';
import XVisibilityIcon from '../components/visibility-icon.vue';
import { faFish } from '@fortawesome/free-solid-svg-icons';
import { parseVisibility } from '../../../common/scripts/parse-visibility';

export default define({
	name: 'post-form',
	props: () => ({
		design: 0
	})
}).extend({
	i18n: i18n('desktop/views/widgets/post-form.vue'),

	components: {
		XPostFormAttaches,
		MkVisibilityChooser,
		XVisibilityIcon,
	},

	data() {
		return {
			posting: false,
			text: '',
			files: [],
			visibility: 'public',
			localOnly: false,
			copyOnce: false,
			secondaryNoteVisibility: 'none',
			tertiaryNoteVisibility: 'none',
			faFish
		};
	},

	computed: {
		placeholder(): string {
			const xs = [
				this.$t('@.note-placeholders.a'),
				this.$t('@.note-placeholders.b'),
				this.$t('@.note-placeholders.c'),
				this.$t('@.note-placeholders.d'),
				this.$t('@.note-placeholders.e'),
				this.$t('@.note-placeholders.f')
			];
			return xs[Math.floor(Math.random() * xs.length)];
		}
	},

	mounted() {
		// デフォルト公開範囲
		this.applyVisibilityFromState();
	},

	methods: {
		func() {
			if (this.props.design == 1) {
				this.props.design = 0;
			} else {
				this.props.design++;
			}
			this.save();
		},

		chooseFile() {
			(this.$refs.file as any).click();
		},

		chooseFileFromDrive() {
			this.$chooseDriveFile({
				multiple: true
			}).then(files => {
				for (const x of files) this.attachMedia(x);
			});
		},

		attachMedia(driveFile) {
			if (driveFile.error) {
				this.$notify(driveFile.error.message);
				return;
			}
			if (this.files.some(x => x.id === driveFile.id)) return;
			this.files.push(driveFile);
			this.$emit('change-attached-files', this.files);
		},

		detachMedia(id) {
			this.files = this.files.filter(x => x.id != id);
			this.$emit('change-attached-files', this.files);
		},

		onKeydown(e) {
			if ((e.which == 10 || e.which == 13) && (e.ctrlKey || e.metaKey) && !this.posting && this.text) this.post();
			if ((e.which == 10 || e.which == 13) && (e.altKey) && !this.posting && this.text
				&& this.secondaryNoteVisibility != null && this.secondaryNoteVisibility != 'none') this.post(this.secondaryNoteVisibility);
		},

		onPaste(e: ClipboardEvent) {
			for (const item of Array.from(e.clipboardData.items)) {
				if (item.kind == 'file') {
					const file = item.getAsFile();
					const lio = file.name.lastIndexOf('.');
					const ext = lio >= 0 ? file.name.slice(lio) : '';
					const name = `${new Date().toISOString().replace(/\D/g, '').substr(0, 14)}${ext}`;
					this.upload(file, name);
				}
			}
		},

		onChangeFile() {
			for (const x of Array.from((this.$refs.file as any).files)) this.upload(x);
		},

		upload(file: File, name?: string) {
			(this.$refs.uploader as any).upload(file, null, name, false, true);
		},

		onDragover(e) {
			const isFile = e.dataTransfer.items[0].kind == 'file';
			const isDriveFile = e.dataTransfer.types[0] == 'mk_drive_file';
			if (isFile || isDriveFile) {
				e.preventDefault();
				e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed == 'all' ? 'copy' : 'move';
			}
		},

		onDrop(e): void {
			// ファイルだったら
			if (e.dataTransfer.files.length > 0) {
				e.preventDefault();
				for (const x of Array.from(e.dataTransfer.files)) this.upload(x);
				return;
			}

			//#region ドライブのファイル
			const driveFile = e.dataTransfer.getData('mk_drive_file');
			if (driveFile != null && driveFile != '') {
				const file = JSON.parse(driveFile);
				this.files.push(file);
				e.preventDefault();
			}
			//#endregion
		},

		async emoji() {
			const Picker = await import('../../../desktop/views/components/emoji-picker-dialog.vue').then(m => m.default);
			const button = this.$refs.emoji;
			const rect = button.getBoundingClientRect();
			const vm = this.$root.new(Picker, {
				x: button.offsetWidth + rect.left + window.pageXOffset,
				y: rect.top + window.pageYOffset
			});
			vm.$on('chosen', (emoji: string) => {
				insertTextAtCursor(this.$refs.text, emoji + String.fromCharCode(0x200B));
			});
		},

		kao() {
			this.text += getFace();
		},

		setVisibility() {
			const w = this.$root.new(MkVisibilityChooser, {
				source: this.$refs.visibilityButton,
				currentVisibility: this.visibility
			});
			w.$once('chosen', v => {
				this.applyVisibility(v);
			});
		},

		applyVisibilityFromState() {
			this.applyVisibility(this.$store.state.settings.rememberNoteVisibility
				? (this.$store.state.device.visibility || this.$store.state.settings.defaultNoteVisibility)
				: this.$store.state.settings.defaultNoteVisibility);

			this.secondaryNoteVisibility = this.$store.state.settings.secondaryNoteVisibility;
			this.tertiaryNoteVisibility = this.$store.state.settings.tertiaryNoteVisibility;
		},

		applyVisibility(v :string) {
			const vis = parseVisibility(v);
			this.localOnly = vis.localOnly;
			this.copyOnce = vis.copyOnce;
			this.visibility = vis.visibility;
		},

		post(v: any) {
			let visibility = this.visibility;
			let localOnly = this.localOnly;
			let copyOnce = this.copyOnce;

			if (typeof v == 'string') {
				const vis = parseVisibility(v);
				localOnly = vis.localOnly;
				copyOnce = vis.copyOnce;
				visibility = vis.visibility;
			}

			this.posting = true;

			this.$root.api('notes/create', {
				text: this.text == '' ? undefined : this.text,
				fileIds: this.files.length > 0 ? this.files.map(f => f.id) : undefined,
				visibility,
				localOnly,
				copyOnce,
			}).then(data => {
				this.clear();
			}).catch((e: any) => {
				this.$root.dialog({
					type: 'error',
					text: e.message || e
				});
			}).finally(() => {
				this.posting = false;
				this.$nextTick(() => {
					this.$refs.text.focus();
				});
			});
		},

		clear() {
			this.text = '';
			this.files = [];
		}
	}
});
</script>

<style lang="stylus" scoped>
.lhcuptdmcdkfwmipgazeawoiuxpzaclc-body
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
			display block
			width 100%
			max-width 100%
			min-width 100%
			padding 16px
			color var(--desktopPostFormTextareaFg)
			outline none
			background var(--desktopPostFormTextareaBg)
			border none
			border-bottom solid 1px var(--faceDivider)
			padding-right 30px

			&:focus
				& + .emoji
					opacity 0.7

	> input[type=file]
		display none

	> footer
		display flex
		padding 8px

		> button:not(.post)
			color var(--text)
			opacity 0.7

			&:hover
				color var(--textHighlighted)
				opacity 1.0

		> .visibility
			margin 0 auto 0 0

		> .secondary, .tertiary
			display block
			margin 0 2px
			padding 0 10px
			height 28px
			color var(--text)
			background: var(--buttonBg) !important
			outline none
			border none
			border-radius 4px
			transition background 0.1s ease
			cursor pointer

			&:hover
				background var(--buttonHoverBg) !important

			&:active
				background var(--buttonActiveBg) !important

		> .post
			display block
			padding 0 10px
			margin-left 3px
			height 28px
			color var(--primaryForeground)
			background var(--primary) !important
			outline none
			border none
			border-radius 4px
			transition background 0.1s ease
			cursor pointer

			&:hover
				background var(--primaryLighten10) !important

			&:active
				background var(--primaryDarken10) !important
				transition background 0s ease

</style>
