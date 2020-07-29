<template>
<div style="position:initial">
	<mk-menu :source="source" :items="items" @closed="closed"/>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { faExclamationCircle, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';
import { faSnowflake } from '@fortawesome/free-regular-svg-icons';
import { faUserTag } from '@fortawesome/free-solid-svg-icons';

export default Vue.extend({
	i18n: i18n('common/views/components/user-menu.vue'),

	props: ['user', 'source'],

	data() {
		let menu = [{
			icon: ['fas', 'at'],
			text: this.$t('mention'),
			action: () => {
				this.$post({ mention: this.user });
			}
		}] as any;
		
		// ログインユーザー
		if (this.$store.getters.isSignedIn && this.$store.state.i.id != this.user.id) {
			menu = menu.concat([
				null,
				{
					icon: faUserTag,
					text: this.$t('@.addUsertag'),
					action: this.addUsertag
				},
				{
					icon: this.user.isHideRenoting ? ['fas', 'eye'] : ['far', 'eye-slash'],
					text: this.user.isHideRenoting ? this.$t('unhide-renote') : this.$t('hide-renote'),
					action: this.toggleHideRenote
				},
				{
					icon: this.user.isMuted ? ['fas', 'eye'] : ['far', 'eye-slash'],
					text: this.user.isMuted ? this.$t('unmute') : this.$t('mute'),
					action: this.toggleMute
				},
				{
					icon: 'ban',
					text: this.user.isBlocking ? this.$t('unblock') : this.$t('block'),
					action: this.toggleBlock
				},
				null,
				{
					icon: faExclamationCircle,
					text: this.$t('report-abuse'),
					action: this.reportAbuse
				}
			]);
		}

		// Admin or Moderator
		if (this.$store.getters.isSignedIn && (this.$store.state.i.isAdmin || this.$store.state.i.isModerator)) {
			menu = menu.concat([null, {
				icon: faMicrophoneSlash,
				text: this.user.isSilenced ? this.$t('unsilence') : this.$t('silence'),
				action: this.toggleSilence
			}, {
				icon: faSnowflake,
				text: this.user.isSuspended ? this.$t('unsuspend') : this.$t('suspend'),
				action: this.toggleSuspend
			}]);
		}

		return {
			items: menu
		};
	},

	methods: {
		closed() {
			this.$nextTick(() => {
				this.destroyDom();
			});
		},

		async addUsertag() {
			const { canceled, result: tag } = await this.$root.dialog({
				title: this.$t('@.addUsertag'),
				text: this.$t('@.addUsertagDetail'),
				input: true
			});

			if (canceled) return;

			this.$root.api('usertags/add', {
				targetId: this.user.id,
				tag
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}, e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async toggleHideRenote() {
			if (this.user.isHideRenoting) {
				if (!await this.getConfirmed(this.$t('unhide-renote-confirm'))) return;

				this.$root.api('user-filter/update', {
					targetId: this.user.id,
					hideRenote: false,
				}).then(() => {
					this.user.isHideRenoting = false;
				}, (e: any) => {
					this.$root.dialog({ type: 'error', text: e });
				});
			} else {
				if (!await this.getConfirmed(this.$t('hide-renote-confirm'))) return;

				this.$root.api('user-filter/update', {
					targetId: this.user.id,
					hideRenote: true,
				}).then(() => {
					this.user.isHideRenoting = true;
				}, (e: any) => {
					this.$root.dialog({ type: 'error', text: e });
				});
			}
		},

		async toggleMute() {
			if (this.user.isMuted) {
				if (!await this.getConfirmed(this.$t('unmute-confirm'))) return;

				this.$root.api('mute/delete', {
					userId: this.user.id
				}).then(() => {
					this.user.isMuted = false;
				}, () => {
					this.$root.dialog({
						type: 'error',
						text: e
					});
				});
			} else {
				if (!await this.getConfirmed(this.$t('mute-confirm'))) return;

				this.$root.api('mute/create', {
					userId: this.user.id
				}).then(() => {
					this.user.isMuted = true;
				}, () => {
					this.$root.dialog({
						type: 'error',
						text: e
					});
				});
			}
		},

		async toggleBlock() {
			if (this.user.isBlocking) {
				if (!await this.getConfirmed(this.$t('unblock-confirm'))) return;

				this.$root.api('blocking/delete', {
					userId: this.user.id
				}).then(() => {
					this.user.isBlocking = false;
				}, () => {
					this.$root.dialog({
						type: 'error',
						text: e
					});
				});
			} else {
				if (!await this.getConfirmed(this.$t('block-confirm'))) return;

				this.$root.api('blocking/create', {
					userId: this.user.id
				}).then(() => {
					this.user.isBlocking = true;
				}, () => {
					this.$root.dialog({
						type: 'error',
						text: e
					});
				});
			}
		},

		async reportAbuse() {
			const reported = this.$t('report-abuse-reported'); // なぜか後で参照すると null になるので最初にメモリに確保しておく
			const { canceled, result: comment } = await this.$root.dialog({
				title: this.$t('report-abuse-detail'),
				input: true
			});
			if (canceled) return;
			this.$root.api('users/report-abuse', {
				userId: this.user.id,
				comment: comment
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					text: reported
				});
			}, e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async toggleSilence() {
			if (!await this.getConfirmed(this.$t(this.user.isSilenced ? 'unsilence-confirm' : 'silence-confirm'))) return;

			this.$root.api(this.user.isSilenced ? 'admin/unsilence-user' : 'admin/silence-user', {
				userId: this.user.id
			}).then(() => {
				this.user.isSilenced = !this.user.isSilenced;
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}, e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async toggleSuspend() {
			if (!await this.getConfirmed(this.$t(this.user.isSuspended ? 'unsuspend-confirm' : 'suspend-confirm'))) return;

			this.$root.api(this.user.isSuspended ? 'admin/unsuspend-user' : 'admin/suspend-user', {
				userId: this.user.id
			}).then(() => {
				this.user.isSuspended = !this.user.isSuspended;
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			}, e => {
				this.$root.dialog({
					type: 'error',
					text: e
				});
			});
		},

		async getConfirmed(text: string): Promise<Boolean> {
			const confirm = await this.$root.dialog({
				type: 'warning',
				showCancelButton: true,
				title: 'confirm',
				text,
			});

			return !confirm.canceled;
		},
	}
});
</script>
