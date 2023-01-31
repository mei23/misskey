<template>
<time class="mk-time" :title="absolute">
	<span v-if=" mode == 'relative' ">{{ relative }}</span>
	<span v-if=" mode == 'absolute' ">{{ absolute }}</span>
	<span v-if=" mode == 'detail' ">{{ absolute }} ({{ relative }})</span>
</time>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import i18n from '../../../i18n';

export default defineComponent({
	i18n: i18n(),
	props: {
		time: {
			type: [Date, String],
			required: true
		},
		mode: {
			type: String,
			default: 'relative'
		}
	},
	data() {
		return {
			tickId: null,
			now: new Date()
		};
	},
	computed: {
		_time(): Date {
			return typeof this.time == 'string' ? new Date(this.time) : this.time;
		},
		absolute(): string {
			return this._time.toLocaleString();
		},
		relative(): string {
			const time = this._time;
			if (time == null) return this.$t('@.time.unknown');

			const diff = (time.getTime() - this.now.getTime()) / 1000;	// sec (positive is future)
			const dir = Math.abs(diff) < 10 ? 'now' : diff < 0 ? 'ago' : 'after';
			const abs = Math.floor(Math.abs(diff) / 10) * 10;	// sec

			if (dir === 'now') return this.$t('@.time.just_now');

			if (abs >= 31536000) {
				const n = Math.floor(abs / 31536000).toString();
				return n === '1' ? this.$t(`@.time.year_${dir}`) : this.$t(`@.time.years_${dir}`).replace('{}', n);
			}
			if (abs >= 2592000) {
				const n = Math.floor(abs / 2592000).toString();
				return n === '1' ? this.$t(`@.time.month_${dir}`) : this.$t(`@.time.months_${dir}`).replace('{}', n);
			}
			if (abs >= 604800) {
				const n = Math.floor(abs / 604800).toString();
				return n === '1' ? this.$t(`@.time.week_${dir}`) : this.$t(`@.time.weeks_${dir}`).replace('{}', n);
			}
			if (abs >= 86400) {
				const n = Math.floor(abs / 86400).toString();
				return n === '1' ? this.$t(`@.time.day_${dir}`) : this.$t(`@.time.days_${dir}`).replace('{}', n);
			}
			if (abs >= 3600) {
				const n = Math.floor(abs / 3600).toString();
				return this.$t(`@.time.hours_${dir}`).replace('{}', n);
			}
			if (abs >= 60) {
				const n = Math.floor(abs / 60).toString();
				return this.$t(`@.time.minutes_${dir}`).replace('{}', n);
			}

			const n = Math.floor(abs).toString();
			return this.$t(`@.time.seconds_${dir}`).replace('{}', n);
		}
	},
	created() {
		if (this.mode == 'relative' || this.mode == 'detail') {
			this.tickId = window.requestAnimationFrame(this.tick);
		}
	},
	destroyed() {
		if (this.mode === 'relative' || this.mode === 'detail') {
			window.clearTimeout(this.tickId);
		}
	},
	methods: {
		tick() {
			this.now = new Date();

			this.tickId = setTimeout(() => {
				window.requestAnimationFrame(this.tick);
			}, 10000);
		}
	}
});
</script>
