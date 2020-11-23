<template>
<div>
	<!-- (今は繋がってるけど) 切断履歴があったときに出るやつ -->
	<div class="disconnect-notify" v-if="stream.state == 'connected' && hasDisconnected
		&& ($store.state.device.hasDisconnectedAction !== 'nothing' || newVersion != null)" @click="resetDisconnected">
		<div><fa icon="exclamation-triangle"/> {{ $t('has-disconnected') }} ({{ disconnectedTime }})</div>
		<div v-if="newVersion != null">
			{{ $t('update-available') }} ({{ newVersion }})<br />
		</div>
		<div class="command">
			<button @click="reload">{{ $t('reload') }}</button>
			<button>{{ $t('ignore') }}</button>
		</div>
	</div>
	<!-- 接続中, 再接続中, 接続完了 -->
	<div class="mk-stream-indicator" ref="indicator">
		<p v-if="stream.state == 'initializing'">
			<fa icon="spinner" pulse/>
			<span>{{ $t('connecting') }}<mk-ellipsis/></span>
		</p>
		<p v-if="stream.state == 'reconnecting'">
			<fa icon="spinner" pulse/>
			<span>{{ $t('reconnecting') }}<mk-ellipsis/></span>
		</p>
		<p v-if="stream.state == 'connected'">
			<fa icon="check"/>
			<span>{{ $t('connected') }}</span>
		</p>
	</div>
</div>
</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import anime from 'animejs';
import checkForUpdate from '../../scripts/check-for-update';
import { env } from '../../../config';

export default Vue.extend({
	i18n: i18n('common/views/components/stream-indicator.vue'),
	data() {
		return {
			hasDisconnected: false,
			t0: 0,
			tSum: 0,
			newVersion: null,
			reloadTimer: null,
		}
	},
	computed: {
		stream() {
			return this.$root.stream;
		},
		disconnectedTime(): string {
			const t = this.tSum / 1000;
			return (
				t >= 86400    ? `${~~(t / 86400)} days` :
				t >= 3600     ? `${~~(t / 3600)} hours` :
				t >= 60       ? `${~~(t / 60)} min` :
				`${~~(t % 60)} sec`);
		},
	},
	created() {
		this.$root.stream.on('_connected_', this.onConnected);
		this.$root.stream.on('_disconnected_', this.onDisconnected);

		this.$nextTick(() => {
			if (this.stream.state == 'connected') {
				this.$el.style.opacity = '0';
			}
		});
	},
	beforeDestroy() {
		this.$root.stream.off('_connected_', this.onConnected);
		this.$root.stream.off('_disconnected_', this.onDisconnected);
	},
	methods: {
		onConnected() {
			if (this.hasDisconnected) {
				this.tSum += Date.now() - this.t0;

				if (this.$store.state.device.hasDisconnectedAction === 'reload') {
					this.reloadTimer = setTimeout(() => {
						this.reload();
					}, 5000);
				}
				checkForUpdate(this.$root, true, true).then(newer => {
					this.newVersion = newer;
				});
			}
			setTimeout(() => {
				anime({
					targets: this.$refs.indicator,
					opacity: 0,
					easing: 'linear',
					duration: 200
				});
			}, 1000);
		},
		onDisconnected() {
			this.hasDisconnected = true;
			this.t0 = Date.now();
			anime({
				targets: this.$refs.indicator,
				opacity: 1,
				easing: 'linear',
				duration: 100
			});
		},
		resetDisconnected() {
			this.hasDisconnected = false;
			this.tSum = 0;
		},
		reload() {
			location.reload();
		},
	}
});
</script>

<style lang="stylus" scoped>
.disconnect-notify
	position fixed
	z-index 16385
	bottom 8px
	right 8px
	margin 0
	padding 6px 12px
	font-size 0.9em
	color #fff
	background rgba(#000)
	border-radius 4px
	max-width 320px

	> .command
		display flex
		justify-content space-around

		> button
			color #aaa
			padding 0.7em

			&:hover
				color #ccc

.mk-stream-indicator
	pointer-events none
	position fixed
	z-index 16384
	bottom 8px
	right 8px
	margin 0
	padding 6px 12px
	font-size 0.9em
	color #fff
	background rgba(#000, 0.8)
	border-radius 4px

	> p
		display block
		margin 0

		> [data-icon]
			margin-right 0.25em

</style>
