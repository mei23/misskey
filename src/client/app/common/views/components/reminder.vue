<template>
<form class="mk-reminder" :class="{ reminderg }" @submit.prevent="onSubmit">
	<ui-input v-model="username" type="text" pattern="^[a-zA-Z0-9_]+$" spellcheck="false" required>
		<span>{{ $t('username') }}</span>
		<template #prefix>@</template>
	</ui-input>
	<ui-input v-model="email" type="text" spellcheck="false" required>
		<span>{{ $t('email') }}</span>
	</ui-input>
	<ui-button type="submit" :disabled="reminderg">{{ $t('submit') }}</ui-button>
</form>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';

export default Vue.extend({
	i18n: i18n('common/views/components/reminder.vue'),

	data() {
		return {
			reminderg: false,
			username: '',
			email: '',
		};
	},

	methods: {
		onSubmit() {
			this.reminderg = true;

			this.$root.api('request-reset-password', {
				username: this.username,
				email: this.email,
			}).then(res => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
				this.$emit('done');
			}).catch(() => {
				alert(this.$t('failed'));
				this.reminderg = false;
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.mk-reminder
	color #555

	&.reminderg
		&, *
			cursor wait !important

	> .avatar
		margin 0 auto 0 auto
		width 64px
		height 64px
		background #ddd
		background-position center
		background-size cover
		border-radius 100%
</style>
