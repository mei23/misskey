<template>
<div>
	<ui-card>
		<template #title><fa :icon="faTerminal"/> {{ $t('operation') }}</template>
		<section class="fit-top">
			<ui-input class="target" v-model="target" type="text" @enter="showUser">
				<span>{{ $t('username-or-userid') }}</span>
			</ui-input>
			<ui-button @click="showUser"><fa :icon="faSearch"/> {{ $t('lookup') }}</ui-button>

			<div ref="user" class="user" v-if="user" :key="user.id">
				<x-user :user="user"/>
				<div class="actions">
					<ui-button @click="resetPassword"><fa :icon="faKey"/> {{ $t('reset-password') }}</ui-button>
					<ui-horizon-group>
						<ui-button v-if="!user.isVerified" @click="verifyUser" :disabled="verifying"><fa :icon="faCertificate"/> {{ $t('verify') }}</ui-button>
						<ui-button v-if="user.isVerified" @click="unverifyUser" :disabled="unverifying">{{ $t('unverify') }}</ui-button>
					</ui-horizon-group>
					<ui-horizon-group>
						<ui-button v-if="!user.isSilenced" @click="silenceUser"><fa :icon="faMicrophoneSlash"/> {{ $t('make-silence') }}</ui-button>
						<ui-button v-if="user.isSilenced" @click="unsilenceUser">{{ $t('unmake-silence') }}</ui-button>
					</ui-horizon-group>
					<ui-horizon-group>
						<!-- 複数回サスペンド/削除出来るのは仕様 -->
						<ui-button @click="suspendUser(user.username)" :disabled="suspending"><fa :icon="faSnowflake"/> {{ $t('suspend') }}</ui-button>
						<ui-button v-if="user.isSuspended" @click="unsuspendUser" :disabled="unsuspending">{{ $t('unsuspend') }}</ui-button>
						<ui-button @click="deleteUser(user.username)">{{ $t('delete') }}</ui-button>
					</ui-horizon-group>
					<ui-button v-if="user.host != null" @click="updateRemoteUser"><fa :icon="faSync"/> {{ $t('update-remote-user') }}</ui-button>
					User:
					<ui-textarea v-if="user" :value="user | json5" readonly tall style="margin-top:16px;"></ui-textarea>
					User signins:
					<ui-textarea v-if="userSignins" :value="userSignins | json5" readonly tall style="margin-top:16px;"></ui-textarea>
				</div>
			</div>
		</section>
	</ui-card>

	<ui-card>
		<template #title><fa :icon="faUsers"/> {{ $t('users.title') }}</template>
		<section class="fit-top">
			<ui-horizon-group inputs>
				<ui-select v-model="sort">
					<template #label>{{ $t('users.sort.title') }}</template>
					<option value="-createdAt">{{ $t('users.sort.createdAtAsc') }}</option>
					<option value="+createdAt">{{ $t('users.sort.createdAtDesc') }}</option>
					<option value="-updatedAt">{{ $t('users.sort.updatedAtAsc') }}</option>
					<option value="+updatedAt">{{ $t('users.sort.updatedAtDesc') }}</option>
				</ui-select>
				<ui-select v-model="state">
					<template #label>{{ $t('users.state.title') }}</template>
					<option value="all">{{ $t('users.state.all') }}</option>
					<option value="available">Available</option>
					<option value="admin">{{ $t('users.state.admin') }}</option>
					<option value="moderator">{{ $t('users.state.moderator') }}</option>
					<option value="verified">{{ $t('users.state.verified') }}</option>
					<option value="silenced">{{ $t('users.state.silenced') }}</option>
					<option value="suspended">{{ $t('users.state.suspended') }}</option>
				</ui-select>
				<ui-select v-model="origin">
					<template #label>{{ $t('users.origin.title') }}</template>
					<option value="combined">{{ $t('users.origin.combined') }}</option>
					<option value="local">{{ $t('users.origin.local') }}</option>
					<option value="remote">{{ $t('users.origin.remote') }}</option>
				</ui-select>
			</ui-horizon-group>
			<ui-horizon-group searchboxes>
				<ui-input v-model="searchUsername" type="text" spellcheck="false" @input="fetchUsers(true)">
					<span>{{ $t('username') }}</span>
				</ui-input>
				<ui-input v-model="searchHost" type="text" spellcheck="false" @input="fetchUsers(true)" :disabled="origin === 'local'">
					<span>{{ $t('host') }}</span>
				</ui-input>
				<ui-input v-model="searchDescription" type="text" spellcheck="false" @input="fetchUsers(true)">
					<span>{{ $t('description') }}</span>
				</ui-input>
				<ui-button @click="fetchUsers(true)"><fa :icon="faSync"/></ui-button>
			</ui-horizon-group>
			<sequential-entrance animation="entranceFromTop" delay="25">
				<x-user v-for="user in users" :key="user.id" :user='user' :click="showUserOnClick"/>
			</sequential-entrance>
			<ui-button v-if="existMore" @click="fetchUsers">{{ $t('@.load-more') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../i18n';
import parseAcct from "../../../../misc/acct/parse";
import { faCertificate, faUsers, faTerminal, faSearch, faKey, faSync, faMicrophoneSlash } from '@fortawesome/free-solid-svg-icons';
import { faSnowflake } from '@fortawesome/free-regular-svg-icons';
import XUser from './users.user.vue';

export default Vue.extend({
	i18n: i18n('admin/views/users.vue'),
	components: {
		XUser
	},
	data() {
		return {
			user: null,
			userSignins: null,
			target: null,
			verifying: false,
			unverifying: false,
			suspending: false,
			unsuspending: false,
			deleting: false,
			sort: '+createdAt',
			state: 'all',
			origin: 'local',
			searchUsername: '',
			searchHost: '',
			searchDescription: '',
			limit: 10,
			offset: 0,
			users: [],
			existMore: false,
			faTerminal, faCertificate, faUsers, faSnowflake, faSearch, faKey, faSync, faMicrophoneSlash
		};
	},

	watch: {
		sort() {
			this.users = [];
			this.offset = 0;
			this.fetchUsers();
		},

		state() {
			this.users = [];
			this.offset = 0;
			this.fetchUsers();
		},

		origin() {
			if (this.origin === 'local') this.searchHost = '';
			this.users = [];
			this.offset = 0;
			this.fetchUsers();
		}
	},

	mounted() {
		this.fetchUsers();
	},

	methods: {
		/** テキストエリアのユーザーを解決する */
		fetchUser() {
			return new Promise((res) => {
				const usernamePromise = this.$root.api('users/show', parseAcct(this.target));
				const idPromise = this.$root.api('users/show', { userId: this.target });

				let _notFound = false;
				const notFound = () => {
					if (_notFound) {
						this.$root.dialog({
							type: 'error',
							text: this.$t('user-not-found')
						});
					} else {
						_notFound = true;
					}
				};

				usernamePromise.then(res).catch(e => {
					if (e == 'user not found') {
						notFound();
					}
				});
				idPromise.then(res).catch(e => {
					notFound();
				});
			});
		},

		/** テキストエリアから処理対象ユーザーを設定する */
		async showUser() {
			this.user = null;
			this.userSignins = null;

			const user = await this.fetchUser();

			await this.$root.api('admin/show-user', { userId: user.id }).then(info => {
				this.user = info;
			});

			await this.$root.api('admin/show-user-signins', { userId: user.id }).then(info => {
				this.userSignins = info;
			});

			this.target = '';
		},

		async showUserOnClick(userId: string) {
			await this.$root.api('admin/show-user', { userId: userId }).then(info => {
				this.user = info;
			});

			await this.$root.api('admin/show-user-signins', { userId: userId }).then(info => {
				this.userSignins = info;
			});

			this.$nextTick(() => {
				this.$refs.user.scrollIntoView();
			});
		},

		/** 処理対象ユーザーの情報を更新する */
		async refreshUser() {
			this.user = null;
			this.userSignins = null;

			this.$root.api('admin/show-user', { userId: this.user._id }).then(info => {
				this.user = info;
			});

			this.$root.api('admin/show-user-signins', { userId: user.id }).then(info => {
				this.userSignins = info;
			});
		},

		async resetPassword() {
			if (!await this.getConfirmed(this.$t('reset-password-confirm'))) return;

			this.$root.api('admin/reset-password', { userId: this.user._id }).then(res => {
				this.$root.dialog({
					type: 'success',
					text: this.$t('password-updated', { password: res.password })
				});
			});
		},

		async verifyUser() {
			if (!await this.getConfirmed(this.$t('verify-confirm'))) return;

			this.verifying = true;

			const process = async () => {
				await this.$root.api('admin/verify-user', { userId: this.user._id });
				this.$root.dialog({
					type: 'success',
					text: this.$t('verified')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});

			this.verifying = false;

			this.refreshUser();
		},

		async unverifyUser() {
			if (!await this.getConfirmed(this.$t('unverify-confirm'))) return;

			this.unverifying = true;

			const process = async () => {
				await this.$root.api('admin/unverify-user', { userId: this.user._id });
				this.$root.dialog({
					type: 'success',
					text: this.$t('unverified')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});

			this.unverifying = false;

			this.refreshUser();
		},

		async silenceUser() {
			if (!await this.getConfirmed(this.$t('silence-confirm'))) return;

			const process = async () => {
				await this.$root.api('admin/silence-user', { userId: this.user._id });
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});

			this.refreshUser();
		},

		async unsilenceUser() {
			if (!await this.getConfirmed(this.$t('unsilence-confirm'))) return;

			const process = async () => {
				await this.$root.api('admin/unsilence-user', { userId: this.user._id });
				this.$root.dialog({
					type: 'success',
					splash: true
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});

			this.refreshUser();
		},

		async suspendUser() {
			if (!await this.getConfirmed(this.$t('suspend-confirm'))) return;

			this.suspending = true;

			const process = async () => {
				await this.$root.api('admin/suspend-user', { userId: this.user._id });
				this.$root.dialog({
					type: 'success',
					text: this.$t('suspended')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});

			this.suspending = false;

			this.refreshUser();
		},

		async unsuspendUser() {
			if (!await this.getConfirmed(this.$t('unsuspend-confirm'))) return;

			this.unsuspending = true;

			const process = async () => {
				await this.$root.api('admin/unsuspend-user', { userId: this.user._id });
				this.$root.dialog({
					type: 'success',
					text: this.$t('unsuspended')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});

			this.unsuspending = false;

			this.refreshUser();
		},

		async deleteUser() {
			if (!await this.getConfirmed(this.$t('delete-confirm'))) return;

			this.deleting = true;

			const process = async () => {
				await this.$root.api('admin/delete-user', { userId: this.user._id });
				this.$root.dialog({
					type: 'success',
					text: this.$t('deleted')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.toString()
				});
			});

			this.deleting = false;

			this.refreshUser();
		},

		async updateRemoteUser() {
			this.$root.api('admin/update-remote-user', { userId: this.user._id }).then(res => {
				this.$root.dialog({
					type: 'success',
					text: this.$t('remote-user-updated')
				});
			});

			this.refreshUser();
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

		fetchUsers(truncate?: boolean) {
			if (truncate) this.offset = 0;
			this.$root.api('admin/show-users', {
				state: this.state,
				origin: this.origin,
				sort: this.sort,
				offset: this.offset,
				limit: this.limit + 1,
				username: this.searchUsername,
				hostname: this.searchHost,
				description: this.searchDescription
			}).then(users => {
				if (users.length == this.limit + 1) {
					users.pop();
					this.existMore = true;
				} else {
					this.existMore = false;
				}
				this.users = truncate ? users : this.users.concat(users);
				this.offset += this.limit;
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.target
	margin-bottom 16px !important

.user
	margin-top 32px

	> .actions
		margin-left 80px
</style>
