<template>
<div>
	<div v-if="$store.getters.isSignedIn && $store.state.i.host == null && $store.state.i.username === $route.params.user" class="options">
		<ui-select v-model="filter">
			<option value="">{{ $t('@.all') }}</option>
			<option value="diff">{{ $t('@.only-not-followed') }}</option>
			<option value="moved">{{ $t('@.only-moved') }}</option>
		</ui-select>
	</div>
	<mk-user-list v-if="filter === 'diff'" :make-promise="makePromiseDiff" :showFollows="true" :key="Math.random()">{{ $t('@.following') }}</mk-user-list>
	<mk-user-list v-else-if="filter === 'moved'" :make-promise="makePromiseMoved" :showFollows="true" :key="Math.random()">{{ $t('@.following') }}</mk-user-list>
	<mk-user-list v-else :make-promise="makePromise" :showFollows="true" :key="Math.random()">{{ $t('@.following') }}</mk-user-list>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import parseAcct from '../../../../../misc/acct/parse';

export default Vue.extend({
	data() {
		return {
			filter: '',
			makePromise: cursor => this.$root.api('users/following', {
				...parseAcct(this.$route.params.user),
				limit: 30,
				cursor: cursor ? cursor : undefined
			}).then(x => {
				return {
					users: x.users,
					cursor: x.next
				};
			}),
			makePromiseDiff: cursor => this.$root.api('users/following', {
				...parseAcct(this.$route.params.user),
				limit: 30,
				diff: true,
				cursor: cursor ? cursor : undefined
			}).then(x => {
				return {
					users: x.users,
					cursor: x.next
				};
			}),
			makePromiseMoved: cursor => this.$root.api('users/following', {
				...parseAcct(this.$route.params.user),
				limit: 30,
				moved: true,
				cursor: cursor ? cursor : undefined
			}).then(x => {
				return {
					users: x.users,
					cursor: x.next
				};
			}),
		};
	},
});
</script>

<style lang="stylus" scoped>
	.options
		margin 16px
</style>
