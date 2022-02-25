<template>
<div>
	<ui-card>
		<template #title><fa :icon="faTerminal"/> {{ $t('operation') }}</template>
		<section class="fit-top">
			<ui-input v-model="target" type="text">
				<span>{{ $t('fileid-or-url') }}</span>
			</ui-input>
			<ui-horizon-group>
				<ui-button @click="findAndToggleSensitive(true)"><fa :icon="faEyeSlash"/> {{ $t('mark-as-sensitive') }}</ui-button>
				<ui-button @click="findAndToggleSensitive(false)"><fa :icon="faEye"/> {{ $t('unmark-as-sensitive') }}</ui-button>
			</ui-horizon-group>
			<ui-button @click="findAndDel()"><fa :icon="faTrashAlt"/> {{ $t('delete') }}</ui-button>
			<ui-button @click="show()"><fa :icon="faSearch"/> {{ $t('lookup') }}</ui-button>

			<div v-if="file" class="kidvdlkg detail">
				<div>
					<div>
						<x-file-thumbnail class="thumbnail" :file="file" fit="contain"/>
					</div>
					<div>
						<header>
							<span class="sensitive" v-if="file.isSensitive"><fa :icon="faEyeSlash"/></span>
							<b>{{ file.name }}</b>
							<span class="username">@{{ file.user | acct }}</span>
						</header>
						<div>
							<div>
								<span style="margin-right:16px;">{{ file.type }}</span>
							</div>
							<div><mk-time :time="file.createdAt" mode="detail"/></div>
						</div>
					</div>
				</div>
			</div>

			<ui-textarea v-if="file" :value="file | json5" readonly tall style="margin-top:16px;"></ui-textarea>
		</section>
	</ui-card>

	<ui-card>
		<template #title><fa :icon="faCloud"/> {{ $t('@.drive') }}</template>
		<section class="fit-top">
			<ui-horizon-group inputs>
				<ui-select v-model="origin">
					<template #label>{{ $t('origin.title') }}</template>
					<option value="combined">{{ $t('origin.combined') }}</option>
					<option value="local">{{ $t('origin.local') }}</option>
					<option value="remote">{{ $t('origin.remote') }}</option>
					<option value="system">{{ $t('origin.system') }}</option>
				</ui-select>
				<ui-input v-model="hostname" type="text" spellcheck="false" :disabled="origin === 'local'">
					<span>{{ $t('@.host') }}</span>
				</ui-input>
			</ui-horizon-group>
			<div class="kidvdlkg" v-for="file in files" :key="file.id">
				<div @click="file._open = !file._open">
					<div>
						<x-file-thumbnail class="thumbnail" :file="file" fit="contain" @click="showFileMenu(file)"/>
					</div>
					<div>
						<header>
							<span class="sensitive" v-if="file.isSensitive"><fa :icon="faEyeSlash"/></span>
							<b>{{ file.name }}</b>
							<span class="username">@{{ file.user | acct }}</span>
						</header>
						<div>
							<div>
								<span style="margin-right:16px;">{{ file.type }}</span>
							</div>
							<div><mk-time :time="file.createdAt" mode="detail"/></div>
						</div>
					</div>
				</div>
				<div v-show="file._open">
					<ui-horizon-group>
						<ui-input readonly :value="file.id"><span>{{ $t('fileId') }}</span></ui-input>
						<ui-input readonly :value="file.webpublicUrl || file.url"></ui-input>
					</ui-horizon-group>
					<ui-horizon-group>
						<ui-button @click="toggleSensitive(file)" v-if="file.isSensitive"><fa :icon="faEye"/> {{ $t('unmark-as-sensitive') }}</ui-button>
						<ui-button @click="toggleSensitive(file)" v-else><fa :icon="faEyeSlash"/> {{ $t('mark-as-sensitive') }}</ui-button>
						<ui-button @click="del(file)"><fa :icon="faTrashAlt"/> {{ $t('delete') }}</ui-button>
					</ui-horizon-group>
				</div>
			</div>
			<ui-button v-if="existMore" @click="fetch">{{ $t('@.load-more') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../i18n';
import { faCloud, faTerminal, faSearch } from '@fortawesome/free-solid-svg-icons';
import { faTrashAlt, faEye, faEyeSlash } from '@fortawesome/free-regular-svg-icons';
import XFileThumbnail from '../../common/views/components/drive-file-thumbnail.vue';

export default Vue.extend({
	i18n: i18n('admin/views/drive.vue'),

	components: {
		XFileThumbnail
	},

	data() {
		return {
			file: null,
			target: null,
			origin: 'local',
			hostname: '',
			limit: 10,
			offset: 0,
			files: [],
			existMore: false,
			faCloud, faTrashAlt, faEye, faEyeSlash, faTerminal, faSearch
		};
	},

	watch: {
		origin() {
			if (this.origin === 'local' || this.origin === 'system') this.hostname = '';
			this.files = [];
			this.offset = 0;
			this.fetch();
		},

		hostname() {
			this.files = [];
			this.offset = 0;
			this.fetch();
		}
	},

	mounted() {
		this.fetch();
	},

	methods: {
		async fetchFile() {
			try {
				return await this.$root.api('drive/files/show', this.target.startsWith('http') ? { url: this.target } : { fileId: this.target });
			} catch (e) {
				this.$root.dialog({
					type: 'error',
					text: e.message || e
				});
			}
		},

		fetch() {
			this.$root.api('admin/drive/files', {
				origin: this.origin,
				hostname: this.hostname,
				offset: this.offset,
				limit: this.limit + 1
			}).then(files => {
				if (files.length == this.limit + 1) {
					files.pop();
					this.existMore = true;
				} else {
					this.existMore = false;
				}
				for (const x of files) {
					x._open = false;
				}
				this.files = this.files.concat(files);
				this.offset += this.limit;
			});
		},

		async del(file: any) {
			const process = async () => {
				await this.$root.api('drive/files/delete', { fileId: file.id });
				this.$root.dialog({
					type: 'success',
					text: this.$t('deleted')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.message || e
				});
			});
		},

		toggleSensitive(file: any) {
			this.$root.api('drive/files/update', {
				fileId: file.id,
				isSensitive: !file.isSensitive
			}).then(() => {
				file.isSensitive = !file.isSensitive;
			});
		},

		async show() {
			const file = await this.fetchFile();
			this.$root.api('admin/drive/show-file', { fileId: file.id }).then(info => {
				this.file = info;
			});
		},

		async findAndToggleSensitive(sensitive) {
			const process = async () => {
				const file = await this.fetchFile();
				await this.$root.api('drive/files/update', {
					fileId: file.id,
					isSensitive: sensitive
				});
				this.$root.dialog({
					type: 'success',
					text: sensitive ? this.$t('marked-as-sensitive') : this.$t('unmarked-as-sensitive')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.message || e
				});
			});
		},

		async findAndDel() {
			const process = async () => {
				const file = await this.fetchFile();
				await this.$root.api('drive/files/delete', { fileId: file.id });
				this.$root.dialog({
					type: 'success',
					text: this.$t('deleted')
				});
			};

			await process().catch(e => {
				this.$root.dialog({
					type: 'error',
					text: e.message || e
				});
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.kidvdlkg
	padding 16px 0
	border-top solid 1px var(--faceDivider)

	&.detail
		padding-top 32px

	> div:first-child
		display flex
		cursor pointer

		> div:nth-child(1)
			> .thumbnail
				display flex
				width 64px
				height 64px
				background-size cover
				background-position center center

		> div:nth-child(2)
			flex 1
			padding-left 16px

			@media (max-width 500px)
				font-size 14px

			> header
				word-break break-word

				> .sensitive
					margin-right 8px

				> .username
					margin-left 8px
					opacity 0.7

</style>
