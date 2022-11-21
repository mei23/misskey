import { parseBasic } from '../../../../mfm/parse';
import { sum, unique } from '../../../../prelude/array';
import { shouldMuteNote } from './should-mute-note';
import MkNoteMenu from '../views/components/note-menu.vue';
import MkReactionPicker from '../views/components/reaction-picker.vue';
import i18n from '../../i18n';

function focus(el, fn) {
	const target = fn(el);
	if (target) {
		if (target.hasAttribute('tabindex')) {
			target.focus();
		} else {
			focus(target, fn);
		}
	}
}

type Opts = {
	mobile?: boolean;
};

export default (opts: Opts = {}) => ({
	i18n: i18n(),

	data() {
		return {
			showContent: this.$store.state.device.alwaysOpenCw,
			hideThisNote: false,
			openingMenu: false
		};
	},

	computed: {
		keymap(): any {
			if (!this.$store.state.device.enableKeyboardShortcutInNote) return {};

			// TODO: ログインしてるかとか権限があるかとか一切チェックしてない
			return {
				'r': () => this.reply(true),
				'e|a|plus': () => this.react(true),
				'q': () => this.renote(true),
				'f|b': this.favorite,
				'delete|ctrl+d': this.del,
				'up|k|shift+tab': this.focusBefore,
				'down|j|tab': this.focusAfter,
				//'esc': this.blur,
				'm|o': () => this.menu(true),
				's': this.toggleShowContent,
				'1': () => this.reactDirectly(this.$store.state.settings.reactions[0]),
				'2': () => this.reactDirectly(this.$store.state.settings.reactions[1]),
				'3': () => this.reactDirectly(this.$store.state.settings.reactions[2]),
				'4': () => this.reactDirectly(this.$store.state.settings.reactions[3]),
				'5': () => this.reactDirectly(this.$store.state.settings.reactions[4]),
				'6': () => this.reactDirectly(this.$store.state.settings.reactions[5]),
				'7': () => this.reactDirectly(this.$store.state.settings.reactions[6]),
				'8': () => this.reactDirectly(this.$store.state.settings.reactions[7]),
				'9': () => this.reactDirectly(this.$store.state.settings.reactions[8]),
				'0': () => this.reactDirectly(this.$store.state.settings.reactions[9]),
			};
		},

		isRenote(): boolean {
			return (this.note.renote &&
				this.note.text == null &&
				this.note.fileIds.length == 0 &&
				this.note.poll == null);
		},

		appearNote(): any {
			return this.isRenote ? this.note.renote : this.note;
		},

		nextIsSame() {
			return !this.note.renote && this.next && !this.next.renote && this.note.userId === this.next.userId;
		},

		prevIsSame() {
			return !this.note.renote && this.prev && !this.prev.renote && this.note.userId === this.prev.userId;
		},

		isMyNote(): boolean {
			return this.$store.getters.isSignedIn && (this.$store.state.i.id === this.appearNote.userId);
		},

		reactionsCount(): number {
			return this.appearNote.reactionCounts
				? sum(Object.values(this.appearNote.reactionCounts))
				: 0;
		},

		title(): string {
			return '';
		},

		urls(): string[] {
			if (this.appearNote.text) {
				const ast = parseBasic(this.appearNote.text);
				const urls = unique(ast
					.filter(node => ((node.type == 'url' || node.type == 'link') && node.props.url && !node.props.silent))
					.map(node => node.props.url));

				// unique without hash
				// [ http://a/#1, http://a/#2, http://b/#3 ] => [ http://a/#1, http://b/#3 ]
				const removeHash = x => x.replace(/#[^#]*$/, '');

				return urls.reduce((array, url) => {
					const removed = removeHash(url);
					if (!array.map(x => removeHash(x)).includes(removed)) array.push(url);
					return array;
				}, []);
			} else {
				return null;
			}
		}
	},

	created() {
		this.hideThisNote = shouldMuteNote(this.$store.state.i, this.$store.state.settings, this.appearNote);
	},

	methods: {
		toggleStayTl() {
			const old = this.appearNote.stayTl
			this.$set(this.appearNote, 'stayTl', !old)
		},

		reply(viaKeyboard = false) {
			if (!this.$store.getters.isSignedIn) {
				this.$root.dialog({ type: 'info', text: this.$t('@.signinOrUsePostUrl') });
				return;
			}

			this.$root.$post({
				reply: this.appearNote,
				animation: !viaKeyboard,
				cb: () => {
					this.focus();
				}
			});
		},

		renote(viaKeyboard = false) {
			if (!this.$store.getters.isSignedIn) {
				this.$root.dialog({ type: 'info', text: this.$t('@.signinOrUsePostUrl') });
				return;
			}

			this.$root.$post({
				renote: this.appearNote,
				animation: !viaKeyboard,
				cb: () => {
					this.focus();
				}
			});
		},

		undoRenote() {
			this.$root.api('notes/delete', {
				noteId: this.appearNote.myRenoteId
			});
		},

		react(viaKeyboard = false) {
			if (!this.$store.getters.isSignedIn) {
				this.$root.dialog({ type: 'info', text: this.$t('@.signinOrUsePostUrl') });
				return;
			}

			this.blur();
			const w = this.$root.new(MkReactionPicker, {
				source: this.$refs.reactButton,
				showFocus: viaKeyboard,
				animation: false
			});
			w.$once('chosen', (reaction, disliked)  => {
				this.$root.api('notes/reactions/create', {
					noteId: this.appearNote.id,
					reaction: reaction,
					dislike: disliked,
				}).then(() => {
					w.close();
				});
			});
			w.$once('closed', this.focus);
		},

		reactDirectly(reaction) {
			this.$root.api('notes/reactions/create', {
				noteId: this.appearNote.id,
				reaction: reaction
			});
		},

		undoReact(note) {
			const oldReaction = note.myReaction;
			if (!oldReaction) return;
			this.$root.api('notes/reactions/delete', {
				noteId: note.id
			});
		},

		favorite() {
			this.$root.api('notes/favorites/create', {
				noteId: this.appearNote.id
			}).then(() => {
				this.$notify(this.$t('@.favorited'));
			});
		},

		del() {
			this.$root.dialog({
				type: 'warning',
				text: (this.appearNote.userId == this.$store.state.i.id) ? this.$t('@.delete-confirm') : this.$t('@.deleteAsAdmin-confirm'),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				this.$root.api('notes/delete', {
					noteId: this.appearNote.id
				});
			});
		},

		menu(viaKeyboard = false) {
			if (!this.$store.getters.isSignedIn) {
				this.$root.dialog({ type: 'info', text: this.$t('@.signinOrUsePostUrl') });
				return;
			}

			if (this.openingMenu) return;
			this.openingMenu = true;
			const w = this.$root.new(MkNoteMenu, {
				source: this.$refs.menuButton,
				note: this.appearNote,
				animation: !viaKeyboard
			}).$once('closed', () => {
				this.openingMenu = false;
				this.focus();
			});
			this.$once('hook:beforeDestroy', () => {
				w.destroyDom();
			});
		},

		toggleShowContent() {
			this.showContent = !this.showContent;
		},

		focus() {
			this.$el.focus();
		},

		blur() {
			this.$el.blur();
		},

		focusBefore() {
			focus(this.$el, e => e.previousElementSibling);
		},

		focusAfter() {
			focus(this.$el, e => e.nextElementSibling);
		}
	}
});
