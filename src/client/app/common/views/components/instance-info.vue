<template>
<div class="instance-info" v-if="instance != null" :title="getDetail(instance)">
	<img class="icon" v-if="instance.iconUrl != null" :src="`/proxy/icon.ico?${urlQuery({ url: instance.iconUrl })}`"/>
	<div class="name">
		{{ (instance.name && instance.name !== instance.host) ? `${instance.name} (${instance.host})` : `${instance.host}` }}
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import { query as urlQuery } from '../../../../../prelude/url';

export default Vue.extend({ 
	props: ['instance'],
	data() {
		return {
			urlQuery
		}
	},
	computed: {
		style(): any {
		},
	},
	mounted() {
	},
	beforeDestroy() {
	},
	methods: {
		getName(instance: any): string {
			if (!instance) return 'Unknown';
			return instance.name ? `${instance.name} (${instance.host})` : `${instance.host})`;
		},
		getDetail(instance: any): string {
			if (!instance) return 'Unknown';
			if (!instance.softwareName) return 'Unknown';
			return instance.softwareVersion ? `${instance.softwareName} (${instance.softwareVersion})` : `${instance.softwareName})`;
		},
	}
});
</script>

<style lang="stylus" scoped>
	.instance-info
		display flex
		align-items center
		font-size 0.9em
		color var(--noteText)

		.icon
			width 1em
			height 1em
			margin-right 0.2em

		.name
			overflow hidden
			white-space nowrap
			text-overflow ellipsis
</style>
