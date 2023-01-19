<template>
<div>
	<!-- add -->
	<ui-card>
		<template #title><fa icon="plus"/> {{ $t('addTitle') }}</template>
		<section class="fit-top">
			<ui-horizon-group inputs>
				<ui-input v-model="addCount" type="number">
					<span>{{ $t('addCount') }}</span>
				</ui-input>
				<ui-select v-model="addExpireSec">
				<template #label>{{ $t('addExpireSec') }}</template>
				<option value="86400">1 {{ $t('day') }}</option>
				<option value="604800">7 {{ $t('day') }}</option>
				<option value="2592000">30 {{ $t('day') }}</option>
				<option value="infinite">{{ $t('infinite') }}</option>
			</ui-select>
			</ui-horizon-group>
			<ui-button @click="createInvitation">{{ $t('add') }}</ui-button>
		</section>
	</ui-card>

	<!-- list -->
	<ui-card>
		<template #title><fa :icon="faUserFriends"/> {{ $t('invitations') }}</template>
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
					<span v-else>{{ $t('infinite') }}</span>
				</span>
			</div>
			<div class="prop">
				<span class="key">{{ $t('restCount') }}</span>
				<span class="val">{{ invitation.restCount || '1' }}</span>
			</div>
			<!--
			<div class="prop">
				<span class="key">{{ $t('invitees') }}</span>
				<span class="val" v-for="invitee in invitation.invitees" :key="`invitee-${invitee?.id}`" >{{ invitee ? `@${invitee.username}` : 'Unknown' }}</span>
			</div>
			-->
			<ui-horizon-group>
				<ui-button class="delete" @click="() => deleteInvitation(invitation)"><fa :icon="faTrashAlt"/> {{ $t('delete') }}</ui-button>
			</ui-horizon-group>
		</section>
		<section style="padding: 16px 32px">
			<ui-button v-if="existMore" @click="fetchInvitations(false)">{{ $t('more') }}</ui-button>
		</section>
	</ui-card>
</div>
</template>

<script lang="ts">
import { defineComponent, getCurrentInstance } from 'vue';
import i18n from '../../i18n';
import { faUserFriends } from '@fortawesome/free-solid-svg-icons';
import { packedInvitation } from '../../../../models/packed-schemas';

export default defineComponent({
	i18n: i18n('admin/views/invitations.vue'),

	data() {
		return {
			$root: getCurrentInstance() as any,

			addCount: '1',
			addExpireSec: '604800',

			invitations: [] as packedInvitation[],
			offset: 0,
			limit: 10,
			existMore: false,

			faUserFriends,
		};
	},

	mounted() {
		this.fetchInvitations();
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

				this.invitations = truncate ? invitations : this.invitations.concat(invitations);
				this.offset += invitations.length;
			});
		},

		createInvitation() {
			this.$root.api('admin/invitations/create', {
				restCount: Number(this.addCount),
				expiredAfter: this.addExpireSec === 'infinite' ? undefined : Number(this.addExpireSec) * 1000,
			}).then(() => {
				this.fetchInvitations(true);
			}).catch((e: Error) => {
				this.$root.dialog({
					type: 'error',
					text: e.message || e,
				});
			});
		},

		deleteInvitation(invitation: packedInvitation) {
			this.$root.api('admin/invitations/delete', {
				id: invitation.id,
			}).then(() => {
				this.fetchInvitations(true);
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
		.delete
			margin: 0.5em 0;
</style>
