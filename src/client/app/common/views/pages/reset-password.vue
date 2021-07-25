<template>
<div class="resetpass17">
	<ui-input v-model="password" type="password" required>
		<span>{{ $t('password') }}</span>
		<template #prefix><fa icon="lock"/></template>
	</ui-input>
	<ui-button type="submit" :disabled="saving" @click="onSave">{{ $t('save') }}</ui-button>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';

export default Vue.extend({
	i18n: i18n('common/views/pages/reset-password.vue'),

	props: {
		token: {
			type: String,
			required: true
		},
	},

	data() {
		return {
			saving: false,
			password: '',
		};
	},

	methods: {
		onSave() {
			this.saving = true;

			this.$root.api('reset-password', {
				token: this.token,
				password: this.password,
			}).then(res => {
				this.$root.dialog({
					type: 'success',
					splash: true
				});
				this.$router.push('/');
			}).catch(() => {
				alert(this.$t('failed'));
				this.saving = false;
			});
		},
	}
});
</script>

<style lang="stylus" scoped>
.resetpass17
	padding 32px
	max-width 500px
	margin 0 auto
	text-align center
	color var(--text)

	$bg = var(--face)
</style>
