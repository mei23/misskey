import insertTextAtCursor from 'insert-text-at-cursor';
import { length } from 'stringz';
import MkVisibilityChooser from '../views/components/visibility-chooser.vue';
import getFace from './get-face';
import { parseBasic } from '../../../../mfm/parse';
import i18n from '../../i18n';
import { erase, unique, concat } from '../../../../prelude/array';
import { faFish, faShareSquare } from '@fortawesome/free-solid-svg-icons';
import { parseVisibility } from './parse-visibility';

export default (opts) => ({
	i18n: i18n(),

	props: {
		reply: {
			type: Object,
			required: false
		},
		airReply: {
			type: Object,
			required: false
		},
		renote: {
			type: Object,
			required: false
		},
		mention: {
			type: Object,
			required: false
		},
		initialText: {
			type: String,
			required: false
		},
		initialNote: {
			type: Object,
			required: false
		},
		fixedTag: {
			type: String,
			required: false
		},
		instant: {
			type: Boolean,
			required: false,
			default: false
		}
	},

	data() {
		return {
			posting: false,
			preview: null,
			previewTimer: null,
			text: '',
			files: [],
			uploadings: [],
			poll: false,
			pollChoices: [],
			pollMultiple: false,
			pollExpiration: [],
			useCw: false,
			cw: null,
			geo: null,
			visibility: 'public',
			visibleUsers: [],
			localOnly: false,
			copyOnce: false,
			secondaryNoteVisibility: 'none',
			tertiaryNoteVisibility: 'none',
			autocomplete: null,
			draghover: false,
			recentHashtags: [],
			maxNoteTextLength: 1000,
			useJpeg: false,
			faFish, faShareSquare
		};
	},

	computed: {
		draftId(): string {
			return this.renote
				? `renote:${this.renote.id}`
				: this.reply
					? `reply:${this.reply.id}`
					: 'note';
		},

		placeholder(): string {
			if (this.fixedTag) return this.$t('@.note-placeholders.tag');

			const xs = [
				this.$t('@.note-placeholders.a'),
				this.$t('@.note-placeholders.b'),
				this.$t('@.note-placeholders.c'),
				this.$t('@.note-placeholders.d'),
				this.$t('@.note-placeholders.e'),
				this.$t('@.note-placeholders.f')
			];
			const x = xs[Math.floor(Math.random() * xs.length)];

			return this.renote
				? this.$t('quote-placeholder')
				: this.reply
					? this.$t('reply-placeholder')
					: x;
		},

		submitText(): string {
			return this.renote && !this.text.length && !this.files.length && !this.poll
				? this.$t('renote')
				: this.reply
					? this.$t('reply')
					: this.$t('submit');
		},

		isUnreachable(): boolean {
			const toRemote = this.reply && this.reply.user.host != null;
			return this.localOnly && toRemote;
		},

		canPost(): boolean {
			return !this.posting &&
				(1 <= this.text.length || 1 <= this.files.length || this.poll || this.renote) &&
				(length(this.text.trim()) <= this.maxNoteTextLength) &&
				(!this.poll || this.pollChoices.length >= 2);
		}
	},

	created() {
		this.$root.getMeta().then(meta => {
			this.maxNoteTextLength = meta.maxNoteTextLength;
		});

		try {
			const tags = JSON.parse(localStorage.getItem('hashtags') || '[]')
			if (typeof tags === 'object') {
				this.recentHashtags = tags;
			} else {
				throw 'not an array';
			}
		} catch (e) {
			localStorage.setItem('hashtags', JSON.stringify([]));
		}
	},

	methods: {
		watch() {
			this.$watch('text', () => this.saveDraft());
			this.$watch('poll', () => this.saveDraft());
			this.$watch('files', () => this.saveDraft());
		},

		normalizedText(maybeText?: string | null) {
			return typeof maybeText === 'string' && this.trimmedLength(maybeText) ? maybeText : null;
		},

		trimmedLength(text: string) {
			return length(text.trim());
		},

		addTag(tag: string) {
			insertTextAtCursor(this.$refs.text, ` #${tag} `);
		},

		focus() {
			(this.$refs.text as any).focus();
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

		onChangeFile() {
			for (const x of Array.from((this.$refs.file as any).files)) this.upload(x);
		},

		upload(file: File, name?: string) {
			(this.$refs.uploader as any).upload(file, null, name, this.useJpeg, true);
		},

		onChangeUploadings(uploads) {
			this.$emit('change-uploadings', uploads);
		},

		onPollUpdate() {
			const got = this.$refs.poll.get();
			this.pollChoices = got.choices;
			this.pollMultiple = got.multiple;
			this.pollExpiration = [got.expiration, got.expiresAt || got.expiredAfter];
			this.saveDraft();
		},

		clear() {
			this.preview = null;
			this.text = '';
			this.cw = '';
			this.files = [];
			this.poll = false;
			this.$emit('change-attached-files', this.files);
		},

		onKeydown(e) {
			if ((e.which == 10 || e.which == 13) && (e.ctrlKey || e.metaKey) && this.canPost) this.post();
			if ((e.which == 10 || e.which == 13) && (e.altKey) && this.canPost
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

		onDragover(e) {
			const isFile = e.dataTransfer.items[0].kind == 'file';
			const isDriveFile = e.dataTransfer.types[0] == 'mk_drive_file';
			if (isFile || isDriveFile) {
				e.preventDefault();
				this.draghover = true;
				e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed == 'all' ? 'copy' : 'move';
			}
		},

		onDragenter(e) {
			this.draghover = true;
		},

		onDragleave(e) {
			this.draghover = false;
		},

		onDrop(e): void {
			this.draghover = false;

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
				this.$emit('change-attached-files', this.files);
				e.preventDefault();
			}
			//#endregion
		},

		setVisibility() {
			const w = this.$root.new(MkVisibilityChooser, {
				source: this.$refs.visibilityButton,
				currentVisibility: this.localOnly ? `local-${this.visibility}` : this.copyOnce ? `once-${this.visibility}` : this.visibility
			});
			w.$once('chosen', v => {
				this.applyVisibility(v);
			});
			this.$once('hook:beforeDestroy', () => {
				w.close();
			});
		},

		applyVisibilityFromState() {
			this.applyVisibility(this.$store.state.settings.rememberNoteVisibility
				? (this.$store.state.device.visibility || this.$store.state.settings.defaultNoteVisibility)
				: this.$store.state.settings.defaultNoteVisibility);

			this.secondaryNoteVisibility = this.$store.state.settings.secondaryNoteVisibility;
			this.tertiaryNoteVisibility = this.$store.state.settings.tertiaryNoteVisibility;
		},

		applyVisibility(v: string) {
			const vis = parseVisibility(v);
			this.localOnly = vis.localOnly;
			this.copyOnce = vis.copyOnce;
			this.visibility = vis.visibility;
		},

		addVisibleUser() {
			this.$root.dialog({
				title: this.$t('@.post-form.enter-username'),
				user: true
			}).then(({ canceled, result: user }) => {
				if (canceled) return;
				this.visibleUsers.push(user);
			});
		},

		removeVisibleUser(user) {
			this.visibleUsers = erase(user, this.visibleUsers);
		},

		async emoji() {
			const Picker = await import('../../desktop/views/components/emoji-picker-dialog.vue').then(m => m.default);
			const button = this.$refs.emoji;
			const rect = button.getBoundingClientRect();
			const vm = this.$root.new(Picker, {
				x: button.offsetWidth + rect.left + window.pageXOffset,
				y: rect.top + window.pageYOffset
			});
			vm.$on('chosen', (emoji: string) => {
				insertTextAtCursor(this.$refs.text, emoji + (emoji.startsWith(':') ? String.fromCharCode(0x200B) : ''));
			});
			this.$once('hook:beforeDestroy', () => {
				vm.close();
			});
		},

		saveDraft() {
			if (this.instant) return;

			const data = JSON.parse(localStorage.getItem('drafts') || '{}');

			data[this.draftId] = {
				updatedAt: new Date(),
				data: {
					text: this.text,
					files: this.files,
					poll: this.poll && this.$refs.poll ? (this.$refs.poll as any).get() : undefined
				}
			};

			localStorage.setItem('drafts', JSON.stringify(data));
		},

		deleteDraft() {
			const data = JSON.parse(localStorage.getItem('drafts') || '{}');

			delete data[this.draftId];

			localStorage.setItem('drafts', JSON.stringify(data));
		},

		kao() {
			this.text += getFace();
		},

		togglePreview() {
			this.$store.commit('device/set', { key: 'showPostPreview', value: this.$refs.preview.open });
		},

		triggerPreview() {
			if (this.previewTimer) clearTimeout(this.previewTimer);
			this.previewTimer = setTimeout(this.doPreview, 1000);
		},

		doPreview() {
			if (!this.canPost || this.text.length > 1000) {
				this.preview = null;
				return;
			}

			this.$root.getMeta().then(meta => {
				const localEmojis = (meta && meta.emojis) ? meta.emojis : [];
				const ms = this.text.match(/:[\w-]+@[\w.-]+:/g) || [];
				const remoteEmojis = ms.map(m => {
					const m2 = m.match(/:(.*)@(.*):/);
					return {
						name: `${m2[1]}@${m2[2]}`,
						host: m2[2],
						url: `${config.url}/files/${m2[1]}@${m2[2]}/${Math.floor(Date.now() / 1000 / 3600)}.png`
					};
				});
				const emojis = concat([localEmojis, remoteEmojis]);

				let text = this.text == '' ? undefined : this.text.trim();
				if (text != null && this.fixedTag) {
					text = `${text.replace(/\s+$/, '')}\n#${this.fixedTag}`;
				}

				this.preview = {
					id: `${Math.random()}`,
					createdAt: new Date().toISOString(),
					userId: this.$store.state.i.id,
					user: this.$store.state.i,
					text,
					visibility: this.visibility,
					localOnly: this.localOnly,
					copyOnce: this.copyOnce,
					fileIds: this.files.length > 0 ? this.files.map(f => f.id) : undefined,
					files: this.files || [],
					replyId: this.reply ? this.reply.id : undefined,
					reply: this.reply,
					renoteId: this.renote ? this.renote.id : this.quoteId ? this.quoteId : undefined,
					renote: this.renote,
					emojis,
				};
			});
		},

		post(v: any) {
			const viaMobile = opts.mobile && !this.$store.state.settings.disableViaMobile;

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

			let text = this.text == '' ? undefined : this.text;
			if (text != null && this.fixedTag) {
				text = `${text.replace(/\s+$/, '')}\n#${this.fixedTag}`;
			}

			this.$root.api('notes/create', {
				text,
				fileIds: this.files.length > 0 ? this.files.map(f => f.id) : undefined,
				replyId: this.reply ? this.reply.id : undefined,
				renoteId: this.renote ? this.renote.id : undefined,
				poll: this.poll ? (this.$refs.poll as any).get() : undefined,
				cw: this.useCw ? this.cw || '' : undefined,
				visibility,
				visibleUserIds: visibility == 'specified' ? this.visibleUsers.map(u => u.id) : undefined,
				localOnly,
				copyOnce,
				viaMobile,
				geo: null
			}).then(data => {
				if (this.initialNote && this.initialNote._edit) {
					this.$root.api('notes/delete', {
						noteId: this.initialNote.id
					});
				}

				this.clear();
				this.deleteDraft();
				this.$emit('posted');
				if (opts.onSuccess) opts.onSuccess(this);
			}).catch(err => {
				if (opts.onFailure) opts.onFailure(this, err);
			}).then(() => {
				this.posting = false;
			});

			if (this.text && this.text != '') {
				const hashtags = parseBasic(this.text).filter(x => x.type === 'hashtag').map(x => x.props.hashtag);
				const history = JSON.parse(localStorage.getItem('hashtags') || '[]') as string[];
				const tags = unique(hashtags.concat(history)).slice(0, 10);
				localStorage.setItem('hashtags', JSON.stringify(tags));
			}
		},
	}
});
