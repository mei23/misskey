<template>
<div>
	<ui-card>
		<template #title><fa icon="user"/> {{ $t('title') }}</template>

		<section class="esokaraujimuwfttfzgocmutcihewscl">
			<div class="header" :style="bannerStyle" @click.stop="updateBanner()" title="Update banner" style="cursor:pointer">
				<mk-avatar class="avatar" :user="$store.state.i" :key="$store.state.i.avatarId" :disable-preview="true" :disable-link="true" @click.stop="updateAvatar()" title="Update avatar" style="cursor:pointer"/>
			</div>

			<ui-form :disabled="saving">
				<ui-input v-model="name" :max="30">
					<span>{{ $t('name') }}</span>
				</ui-input>

				<ui-textarea v-model="description" :max="500">
					<span>{{ $t('description') }}</span>
					<template #desc>{{ $t('you-can-include-hashtags') }}</template>
				</ui-textarea>

				<ui-input v-model="location">
					<span>{{ $t('location') }}</span>
					<template #prefix><fa icon="map-marker-alt"/></template>
				</ui-input>

				<ui-input v-model="birthday" type="date">
					<template #title>{{ $t('birthday') }}</template>
					<template #prefix><fa icon="birthday-cake"/></template>
				</ui-input>

				<ui-horizon-group inputs>
					<ui-input type="file" @change="onAvatarChange">
						<span>{{ $t('avatar') }}</span>
						<template #icon><fa icon="image"/></template>
						<template #desc v-if="avatarUploading">{{ $t('uploading') }}<mk-ellipsis/></template>
					</ui-input>

					<ui-input type="file" @change="onBannerChange">
						<span>{{ $t('banner') }}</span>
						<template #icon><fa icon="image"/></template>
						<template #desc v-if="bannerUploading">{{ $t('uploading') }}<mk-ellipsis/></template>
					</ui-input>
				</ui-horizon-group>

				<details class="fields">
					<summary>{{ $t('profile-metadata') }}</summary>
					<ui-horizon-group>
						<ui-input v-model="fieldName0">{{ $t('metadata-label') }}</ui-input>
						<ui-input v-model="fieldValue0">{{ $t('metadata-content') }}</ui-input>
					</ui-horizon-group>
					<ui-horizon-group>
						<ui-input v-model="fieldName1">{{ $t('metadata-label') }}</ui-input>
						<ui-input v-model="fieldValue1">{{ $t('metadata-content') }}</ui-input>
					</ui-horizon-group>
					<ui-horizon-group>
						<ui-input v-model="fieldName2">{{ $t('metadata-label') }}</ui-input>
						<ui-input v-model="fieldValue2">{{ $t('metadata-content') }}</ui-input>
					</ui-horizon-group>
					<ui-horizon-group>
						<ui-input v-model="fieldName3">{{ $t('metadata-label') }}</ui-input>
						<ui-input v-model="fieldValue3">{{ $t('metadata-content') }}</ui-input>
					</ui-horizon-group>
				</details>

				<ui-button primary @click="save(true)"><fa :icon="faSave"/> {{ $t('save') }}</ui-button>
			</ui-form>
		</section>
	</ui-card>

	<ui-card>
		<template #title><fa :icon="faCogs"/> {{ $t('advanced') }}</template>

		<section>
			<div>
				<ui-switch v-model="isCat" @change="save(false)">{{ $t('is-cat') }}</ui-switch>
				<ui-switch v-model="isBot" @change="save(false)">{{ $t('is-bot') }}</ui-switch>
				<ui-switch v-model="alwaysMarkNsfw">{{ $t('@._settings.always-mark-nsfw') }}</ui-switch>
			</div>
		</section>

		<section>
			<header><fa :icon="faUnlockAlt"/> {{ $t('privacy') }}</header>

			<div>
				<ui-switch v-model="isLocked" @change="save(false)">{{ $t('is-locked') }}</ui-switch>
				<ui-switch v-model="refuseFollow" @change="save(false)">{{ $t('refuseFollow') }}</ui-switch>
				<ui-switch v-model="carefulBot" :disabled="isLocked || refuseFollow" @change="save(false)">{{ $t('careful-bot') }}</ui-switch>
				<ui-switch v-model="carefulRemote" :disabled="isLocked || refuseFollow" @change="save(false)">{{ $t('careful-remote') }}</ui-switch>
				<ui-switch v-model="carefulMassive" :disabled="isLocked || refuseFollow" @change="save(false)">{{ $t('careful-massive') }}</ui-switch>
				<ui-switch v-model="autoAcceptFollowed" :disabled="!isLocked && !refuseFollow && !carefulBot && !carefulRemote && !carefulMassive" @change="save(false)">{{ $t('auto-accept-followed') }}</ui-switch>
				<ui-switch v-model="avoidSearchIndex" @change="save(false)">{{ $t('avoid-search-index') }}</ui-switch>
				<ui-switch v-model="isExplorable" @change="save(false)">{{ $t('isExplorable') }}</ui-switch>
				<ui-select v-model="hideFollows" @input="save(false)">
					<option value="">{{ $t('hideFollows-none') }}</option>
					<option value="follower">{{ $t('hideFollows-follower') }}</option>
					<option value="always">{{ $t('hideFollows-always') }}</option>
				</ui-select>
			</div>
		</section>

		<section v-if="enableEmail">
			<header><fa :icon="faEnvelope"/> {{ $t('email') }}</header>

			<div>
				<template v-if="$store.state.i.email != null">
					<ui-info v-if="$store.state.i.emailVerified">{{ $t('email-verified') }}</ui-info>
					<ui-info v-else warn>{{ $t('email-not-verified') }}</ui-info>
				</template>
				<ui-input v-model="email" type="email"><span>{{ $t('email-address') }}</span></ui-input>
				<ui-button @click="updateEmail()"><fa :icon="faSave"/> {{ $t('save') }}</ui-button>
			</div>
		</section>

		<section>
			<header><fa :icon="faBoxes"/> {{ $t('export-and-import') }}</header>

			<div>
				<ui-select v-model="exportTarget">
					<option value="notes">{{ $t('export-targets.all-notes') }}</option>
					<option value="following">{{ $t('export-targets.following-list') }}</option>
					<option value="mute">{{ $t('export-targets.mute-list') }}</option>
					<option value="blocking">{{ $t('export-targets.blocking-list') }}</option>
					<option value="user-lists">{{ $t('export-targets.user-lists') }}</option>
				</ui-select>
				<ui-horizon-group class="fit-bottom">
					<ui-button @click="doExport()"><fa :icon="faDownload"/> {{ $t('export') }}</ui-button>
					<ui-button @click="doImport()" :disabled="!['following', 'mute', 'blocking', 'user-lists'].includes(exportTarget)"><fa :icon="faUpload"/> {{ $t('import') }}</ui-button>
				</ui-horizon-group>
			</div>
		</section>

		<section>
			<details>
				<summary>{{ $t('danger-zone') }}</summary>
				<ui-button @click="deleteAccount()">{{ $t('delete-account') }}</ui-button>
				<ui-button v-if="!noFederation" @click="disableFederation()">{{ $t('disable-federation') }}</ui-button>
				<ui-button v-if="noFederation" @click="enableFederation()">{{ $t('enable-federation') }}</ui-button>
			</details>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import { apiUrl, host } from '../../../../config';
import { toUnicode } from 'punycode/';
import { unique } from '../../../../../../prelude/array';
import { faDownload, faUpload, faUnlockAlt, faBoxes, faCogs } from '@fortawesome/free-solid-svg-icons';
import { faSave, faEnvelope } from '@fortawesome/free-regular-svg-icons';
import updateAvatar from '../../../../desktop/api/update-avatar';
import updateBanner from '../../../../desktop/api/update-banner';

export default Vue.extend({
	i18n: i18n('common/views/components/profile-editor.vue'),

	data() {
		return {
			unique,
			host: toUnicode(host),
			enableEmail: false,
			email: null,
			name: null,
			username: null,
			location: null,
			description: null,
			birthday: null,
			avatarId: null,
			bannerId: null,
			isCat: false,
			isBot: false,
			isLocked: false,
			refuseFollow: false,
			carefulBot: false,
			carefulRemote: false,
			carefulMassive: true,
			autoAcceptFollowed: false,
			avoidSearchIndex: false,
			isExplorable: false,
			hideFollows: '',
			noFederation: false,
			fieldName0 : null,
			fieldValue0 : null,
			fieldName1 : null,
			fieldValue1 : null,
			fieldName2 : null,
			fieldValue2 : null,
			fieldName3 : null,
			fieldValue3 : null,
			saving: false,
			avatarUploading: false,
			bannerUploading: false,
			exportTarget: 'following',
			faDownload, faUpload, faSave, faEnvelope, faUnlockAlt, faBoxes, faCogs
		};
	},

	computed: {
		alwaysMarkNsfw: {
			get() { return this.$store.state.i.settings.alwaysMarkNsfw; },
			set(value) { this.$root.api('i/update', { alwaysMarkNsfw: value }); }
		},

		bannerStyle(): any {
			if (this.$store.state.i.bannerUrl == null) return {};
			return {
				backgroundColor: this.$store.state.i.bannerColor && this.$store.state.i.bannerColor.length == 3 ? `rgb(${ this.$store.state.i.bannerColor.join(',') })` : null,
				backgroundImage: `url(${ this.$store.state.i.bannerUrl })`
			};
		},
	},

	created() {
		this.$root.getMeta().then(meta => {
			this.enableEmail = meta.enableEmail;
		});
		this.email = this.$store.state.i.email;
		this.name = this.$store.state.i.name;
		this.username = this.$store.state.i.username;
		this.location = this.$store.state.i.profile.location;
		this.description = this.$store.state.i.description;
		this.birthday = this.$store.state.i.profile.birthday;
		this.avatarId = this.$store.state.i.avatarId;
		this.bannerId = this.$store.state.i.bannerId;
		this.isCat = this.$store.state.i.isCat;
		this.isBot = this.$store.state.i.isBot;
		this.isLocked = this.$store.state.i.isLocked;
		this.refuseFollow = this.$store.state.i.refuseFollow;
		this.carefulBot = this.$store.state.i.carefulBot;
		this.carefulRemote = this.$store.state.i.carefulRemote;
		this.carefulMassive = this.$store.state.i.carefulMassive;
		this.autoAcceptFollowed = this.$store.state.i.autoAcceptFollowed;
		this.avoidSearchIndex = this.$store.state.i.avoidSearchIndex;
		this.isExplorable = this.$store.state.i.isExplorable;
		this.hideFollows = this.$store.state.i.hideFollows;
		this.noFederation = this.$store.state.i.noFederation;

		if (this.$store.state.i.fields) {
			const fetchName = (i: number) => this.$store.state.i.fields[i] ? this.$store.state.i.fields[i].name : null;
			const fetchValue = (i: number) => this.$store.state.i.fields[i] ? this.$store.state.i.fields[i].value : null;

			this.fieldName0 = fetchName(0);
			this.fieldValue0 = fetchValue(0);
			this.fieldName1 = fetchName(1);
			this.fieldValue1 = fetchValue(1);
			this.fieldName2 = fetchName(2);
			this.fieldValue2 = fetchValue(2);
			this.fieldName3 = fetchName(3);
			this.fieldValue3 = fetchValue(3);
		}
	},

	methods: {
		updateAvatar() {
			if (this.$root.isMobile) return;
			updateAvatar(this.$root)();
		},

		updateBanner() {
			if (this.$root.isMobile) return;
			updateBanner(this.$root)();
		},

		onAvatarChange([file]) {
			this.avatarUploading = true;

			const data = new FormData();
			data.append('file', file);
			data.append('i', this.$store.state.i.token);
			data.append('force', 'true');

			fetch(apiUrl + '/drive/files/create', {
				method: 'POST',
				body: data
			})
				.then(response => response.json())
				.then(f => {
					this.avatarId = f.id;
					this.avatarUploading = false;
				})
				.catch(e => {
					this.avatarUploading = false;
					alert('%18n:@upload-failed%');
				});
		},

		onBannerChange([file]) {
			this.bannerUploading = true;

			const data = new FormData();
			data.append('file', file);
			data.append('i', this.$store.state.i.token);
			data.append('force', 'true');

			fetch(apiUrl + '/drive/files/create', {
				method: 'POST',
				body: data
			})
				.then(response => response.json())
				.then(f => {
					this.bannerId = f.id;
					this.bannerUploading = false;
				})
				.catch(e => {
					this.bannerUploading = false;
					alert('%18n:@upload-failed%');
				});
		},

		save(notify) {
			const fields = [
				{ name: this.fieldName0, value: this.fieldValue0 },
				{ name: this.fieldName1, value: this.fieldValue1 },
				{ name: this.fieldName2, value: this.fieldValue2 },
				{ name: this.fieldName3, value: this.fieldValue3 },
			];

			this.saving = true;

			this.$root.api('i/update', {
				name: this.name || null,
				location: this.location || null,
				description: this.description || null,
				birthday: this.birthday || null,
				avatarId: this.avatarId || undefined,
				bannerId: this.bannerId || undefined,
				isCat: !!this.isCat,
				isBot: !!this.isBot,
				isLocked: !!this.isLocked,
				refuseFollow: !!this.refuseFollow,
				carefulBot: !!this.carefulBot,
				carefulRemote: !!this.carefulRemote,
				carefulMassive: !!this.carefulMassive,
				autoAcceptFollowed: !!this.autoAcceptFollowed,
				avoidSearchIndex: !!this.avoidSearchIndex,
				isExplorable: !!this.isExplorable,
				hideFollows: this.hideFollows || '',
				fields,
			}).then(i => {
				this.saving = false;
				this.$store.state.i.avatarId = i.avatarId;
				this.$store.state.i.avatarUrl = i.avatarUrl;
				this.$store.state.i.bannerId = i.bannerId;
				this.$store.state.i.bannerUrl = i.bannerUrl;

				if (notify) {
					this.$root.dialog({
						type: 'success',
						text: this.$t('saved')
					});
				}
			}).catch(err => {
				this.saving = false;
				switch(err.id) {
					case 'f419f9f8-2f4d-46b1-9fb4-49d3a2fd7191':
						this.$root.dialog({
							type: 'error',
							title: this.$t('unable-to-process'),
							text: this.$t('avatar-not-an-image')
						});
						break;
					case '75aedb19-2afd-4e6d-87fc-67941256fa60':
						this.$root.dialog({
							type: 'error',
							title: this.$t('unable-to-process'),
							text: this.$t('banner-not-an-image')
						});
						break;
					default:
						this.$root.dialog({
							type: 'error',
							text: this.$t('unable-to-process')
						});
				}
			});
		},

		updateEmail() {
			this.$root.dialog({
				title: this.$t('@.enter-password'),
				input: {
					type: 'password'
				}
			}).then(({ canceled, result: password }) => {
				if (canceled) return;
				this.$root.api('i/update_email', {
					password: password,
					email: this.email == '' ? null : this.email
				});
			});
		},

		doExport() {
			this.$root.api(
				this.exportTarget == 'notes' ? 'i/export-notes' :
				this.exportTarget == 'following' ? 'i/export-following' :
				this.exportTarget == 'mute' ? 'i/export-mute' :
				this.exportTarget == 'blocking' ? 'i/export-blocking' :
				this.exportTarget == 'user-lists' ? 'i/export-user-lists' :
				null, {}).then(() => {
					this.$root.dialog({
						type: 'info',
						text: this.$t('export-requested')
					});
				}).catch((e: any) => {
					this.$root.dialog({
						type: 'error',
						text: e.message
					});
				});
		},

		doImport() {
			this.$chooseDriveFile().then(file => {
				if (this.exportTarget === 'following' && file.name?.match(/mute|block/i)) {
					throw new Error(`following but name is ${file.name}`);
				}
				if (this.exportTarget === 'mute' && file.name?.match(/follow/i)) {
					throw new Error(`mute but name is ${file.name}`);
				}
				if (this.exportTarget === 'blocking' && file.name?.match(/follow/i)) {
					throw new Error(`blocking but name is ${file.name}`);
				}

				this.$root.api(
					this.exportTarget == 'following' ? 'i/import-following' :
					this.exportTarget == 'mute' ? 'i/import-mute' :
					this.exportTarget == 'blocking' ? 'i/import-blocking' :
					this.exportTarget == 'user-lists' ? 'i/import-user-lists' :
					null, {
						fileId: file.id
				}).then(() => {
					this.$root.dialog({
						type: 'info',
						text: this.$t('import-requested')
					});
				}).catch((e: any) => {
					this.$root.dialog({
						type: 'error',
						text: e.message
					});
				});
			}).catch((e: any) => {
					this.$root.dialog({
						type: 'error',
						text: e.message
					});
			});
		},

		async disableFederation() {
			this.$root.dialog({
				type: 'warning',
				text: this.$t('disable-federation-confirm'),
				showCancelButton: true
			}).then(({ canceled }) => {
				if (canceled) return;

				this.saving = true;
				this.noFederation = true;
				this.$root.api('i/update', {
					noFederation: this.noFederation
				}).then(i => {
					this.saving = false;
					this.$root.dialog({
						type: 'success',
						text: 'Saved'
					});
				});
			});
		},

		async enableFederation() {
			this.saving = true;
			this.noFederation = false;
			this.$root.api('i/update', {
				noFederation: this.noFederation
			}).then(i => {
				this.saving = false;
				this.$root.dialog({
					type: 'success',
					text: 'Saved'
				});
			});
		},

		async deleteAccount() {
			const { canceled: canceled, result: password } = await this.$root.dialog({
				title: this.$t('enter-password'),
				input: {
					type: 'password'
				}
			});
			if (canceled) return;

			const { canceled: canceled2 } = await this.$root.dialog({
				title: this.$t('delete-account-confirm'),
				showCancelButton: true
			});
			if (canceled2) return;

			this.$root.api('i/delete-account', {
				password
			}).then(() => {
				this.$root.dialog({
					type: 'success',
					text: this.$t('account-deleted')
				}).then(() => {
					this.$root.signout();
				});
			}).catch((e: any) => {
				this.$root.dialog({
					type: 'error',
					text: e.message
				});
			});
		}
	}
});
</script>

<style lang="stylus" scoped>
.esokaraujimuwfttfzgocmutcihewscl
	> .header
		height 150px
		overflow hidden
		background-size cover
		background-position center
		border-radius 4px

		> .avatar
			position absolute
			top 0
			bottom 0
			left 0
			right 0
			display block
			width 72px
			height 72px
			margin auto

.fields
	margin-bottom 2em

	> summary
		cursor pointer
		font-size small

	> header
		padding 8px 0px
		font-weight bold

</style>
