<template>
<ui-card>
	<template #title><fa icon="key"/> API</template>

	<section class="fit-top">
		<ui-input :value="$store.state.i.token" readonly>
			<span>{{ $t('token') }}</span>
		</ui-input>
		<p>{{ $t('intro') }}</p>
		<ui-info warn>{{ $t('caution') }}</ui-info>
		<p>{{ $t('regeneration-of-token') }}</p>
		<ui-button @click="regenerateToken"><fa icon="sync-alt"/> {{ $t('regenerate-token') }}</ui-button>
	</section>

	<section>
		<header><fa icon="terminal"/> {{ $t('console.title') }}</header>
		<ui-input v-model="endpoint" :datalist="endpoints" @keydown="onEndpointChange()">
			<span>{{ $t('console.endpoint') }}</span>
		</ui-input>
		<ui-textarea v-model="body">
			<span>{{ $t('console.parameter') }} (JSON or JSON5)</span>
			<template #desc>{{ $t('console.credential-info') }}</template>
		</ui-textarea>
		<ui-button @click="send" :disabled="sending">
			<template v-if="sending">{{ $t('console.sending') }}</template>
			<template v-else><fa icon="paper-plane"/> {{ $t('console.send') }}</template>
		</ui-button>
		<div v-if="res" style="opacity: 0.7; font-size: 13px; margin-top: 1.5em; margin-bottom: -8px;">{{ $t('console.response') + ` (${resTime} ms)` }}</div>
		<highlightjs v-if="res" :language="json" :code="res"/>
	</section>
</ui-card>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../../i18n';
import * as JSON5 from 'json5';

export default Vue.extend({
	i18n: i18n('common/views/components/api-settings.vue'),

	data() {
		return {
			endpoint: 'ping',
			body: '{}',
			res: null,
			resTime: 0,
			sending: false,
			endpoints: []
		};
	},

	created() {
		this.$root.api('endpoints', {}, false, true).then(endpoints => {
			this.endpoints = endpoints;
		});
	},

	methods: {
		regenerateToken() {
			this.$root.dialog({
				title: this.$t('enter-password'),
				input: {
					type: 'password'
				}
			}).then(({ canceled, result: password }) => {
				if (canceled) return;
				this.$root.api('i/regenerate_token', {
					password: password
				});
			});
		},

		send() {
			let body;
			try {
				body = this.body ? JSON5.parse(this.body) : undefined;
			} catch(e) {
				this.$root.dialog({
					type: 'error',
					text: e.message
				});
			}

			this.sending = true;
			const t0 = Date.now();
			this.$root.api(this.endpoint, body).then(res => {
				this.resTime = Date.now() - t0;
				this.sending = false;
				this.res = JSON.stringify(res, null, 2) || 'NO CONTENT';
			}, err => {
				this.resTime = Date.now() - t0;
				this.sending = false;
				this.res = JSON.stringify(err, null, 2) || 'UNKNOWN ERROR';
			});
		},

		onEndpointChange() {
			this.$root.api('endpoint', { endpoint: this.endpoint }, false, true).then(endpoint => {
				if (!endpoint) return;
				const body = {};
				for (const p of endpoint.params) {
					body[p.name] =
						p.type === 'String' ? p.enum ? p.enum[0] : typeof p.default === 'string' ? p.default : '' :
						p.type === 'Number' ? typeof p.default === 'number' ? p.default : 1 :
						p.type === 'Boolean' ? typeof p.default === 'boolean' ? p.default : false :
						p.type === 'Array' ? [] :
						p.type === 'Object' ? {} :
						null;
				}
				this.body = JSON5.stringify(body, null, 2);
			});
		},
	}
});
</script>

<style lang="stylus">
code.hljs
	font-size small
	overflow-x auto
	overflow-y auto
	max-height 320px
</style>

