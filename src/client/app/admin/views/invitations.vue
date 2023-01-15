<template>
<div>
	<!-- add -->
	<!--
	<ui-card>
		<template #title><fa icon="plus"/> {{ $t('add-invitation.title') }}</template>
		<section class="fit-top">
			<ui-horizon-group inputs>
				<ui-input v-model="name">
					<span>{{ $t('add-invitation.name') }}</span>
					<template #desc>{{ $t('add-invitation.name-desc') }}</template>
				</ui-input>
				<ui-input v-model="category" :datalist="categoryList">
					<span>{{ $t('add-invitation.category') }}</span>
				</ui-input>
				<ui-input v-model="aliases">
					<span>{{ $t('add-invitation.aliases') }}</span>
					<template #desc>{{ $t('add-invitation.aliases-desc') }}</template>
				</ui-input>
			</ui-horizon-group>
			<ui-input v-model="url">
				<template #icon><fa icon="link"/></template>
				<span>{{ $t('add-invitation.url') }}</span>
			</ui-input>
			<ui-info>{{ $t('add-invitation.info') }}</ui-info>
			<ui-button @click="add">{{ $t('add-invitation.add') }}</ui-button>
		</section>
	</ui-card>
	-->

	<!-- list -->
	<ui-card>
		<template #title><fa :icon="faGrin"/> {{ $t('invitations') }}</template>
		<!--
		<section style="padding: 16px 32px">
			<ui-horizon-group searchboxes>
				<ui-input v-model="searchLocal" type="text" spellcheck="false" @input="fetchInvitations(true)">
					<span>{{ $t('name') }}</span>
				</ui-input>
				<ui-input v-model="searchCategory" type="text" spellcheck="false" @input="fetchInvitations(true)">
					<span>{{ $t('add-invitation.category') }}</span>
				</ui-input>
			</ui-horizon-group>
		</section>
		-->
		<section class="invite" v-for="invitation in invitations" :key="invitation.id">
			<div class="prop">
				<span class="key">{{ $t('code') }}</span>
				<span class="val">{{ invitation.code }}</span>
			</div>
			<div class="prop">
				<span class="key">{{ $t('inviter') }}</span>
				<span class="val">{{ invitation.inviter ? `@${invitation.inviter.username}` : $t('unknown') }}</span>
			</div>
			<div class="prop">
				<span class="key">{{ $t('createdAt') }}</span>
				<span class="val"><mk-time :time="invitation.createdAt" mode="detail"/></span>
			</div>
			<div class="prop">
				<span class="key">{{ $t('expiredAt') }}</span>
				<span class="val">
					<mk-time v-if="invitation.expiredAt" :time="invitation.expiredAt" mode="detail"/>
					<span v-else>{{ $t('eternity') }}</span>
				</span>
			</div>
			<div class="prop">
				<span class="key">{{ $t('restCount') }}</span>
				<span class="val">{{ invitation.restCount || '1' }}</span>
			</div>
			<div class="prop">
				<span class="key">{{ $t('invitees') }}</span>
				<span class="val" v-for="invitee in invitation.invitees" :key="`invitee-${invitee?.id}`" >{{ invitee ? `@${invitee.username}` : 'Unknown' }}</span>
			</div>
			<!--
			<div>
				<img :src="invitation.url" :alt="invitation.name" style="width: 64px;"/>
			</div>

			<div>
				<ui-horizon-group>
					<ui-input v-model="invitation.name">
						<span>{{ $t('add-invitation.name') }}</span>
					</ui-input>
					<ui-input v-model="invitation.category" :datalist="categoryList">
						<span>{{ $t('add-invitation.category') }}</span>
					</ui-input>
					<ui-input v-model="invitation.aliases">
						<span>{{ $t('add-invitation.aliases') }}</span>
					</ui-input>
					<ui-select v-model="invitation.direction">
						<template #label>{{ $t('add-invitation.direction') }}</template>
						<option value="none">{{ $t('none') }}</option>
						<option value="left">{{ $t('left') }}</option>
						<option value="right">{{ $t('right') }}</option>
					</ui-select>
				</ui-horizon-group>
				<ui-input v-model="invitation.url">
					<template #icon><fa icon="link"/></template>
					<span>{{ $t('add-invitation.url') }}</span>
				</ui-input>
				<ui-horizon-group class="fit-bottom">
					<ui-button @click="updateinvitation(invitation)"><fa :icon="['far', 'save']"/> {{ $t('invitations.update') }}</ui-button>
					<ui-button @click="removeinvitation(invitation)"><fa :icon="['far', 'trash-alt']"/> {{ $t('invitations.remove') }}</ui-button>
				</ui-horizon-group>
			</div>-->
		</section>
		
		<section style="padding: 16px 32px">
			<ui-button v-if="existMore" @click="fetchInvitations(false)">More</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../i18n';
import { faGrin } from '@fortawesome/free-regular-svg-icons';
import { packedInvitation } from '../../../../models/packed-schemas';

export default defineComponent({
	i18n: i18n('admin/views/invitations.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			invitations: [] as packedInvitation[],
			offset: 0,
			limit: 1,
			existMore: false,



			name: '',
			category: '',
			url: '',
			aliases: '',
			direction: 'none',

			searchLocal: '',
			searchCategory: '',
			searchRemote: '',
			searchHost: '',
			origin: 'all',
			faGrin
		};
	},

	watch: {
		/*
		origin() {
			this.fetchInvitations('remote', true);
		}
		*/
	},

	mounted() {
		this.fetchInvitations();
	},

	computed: {
	},

	methods: {
		fetchInvitations(truncate?: boolean) {
			if (truncate) this.offset = 0;
			this.$root.api('admin/invitations/list', {
				offset: this.offset,
				limit: this.limit + 1,
			}).then((invitations: packedInvitation[]) => {
				if (invitations.length === this.limit + 1) {
					invitations.pop();
					this.existMore = true;
				} else {
					this.existMore = false;
				}

				this.invitations = this.invitations.concat(invitations);
				this.offset += invitations.length;
			});
		},
	},
});
</script>

<style lang="stylus" scoped>
	.invite
		.prop
			.key
				padding-right: 0.2em;
				&:after
					content: ':';
			.val
				//
</style>
