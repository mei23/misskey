<template>
	<div class="mkw-sunmoon">
		<div class="lunar-calendar">
			<!-- <p class="moonface"><img :src="moonFace" height="64" :style="`transform:rotateZ(${moonAngle}rad);`"></p> -->
			<p class="moonface"><img :src="moonFace" height="64"></p>
			<p class="moonage">{{ moonAge }}</p>
		</div>
		<div class="suntime">
			<div><small>{{ $t('ctStart') }}: {{ civTwiStartTime }}</small></div>
			<div>{{ $t('sunrise') }}: {{ sunRiseTime }}</div>
			<div>{{ $t('sunset') }}: {{ sunSetTime }}</div>
			<div><small>{{ $t('ctEnd') }}: {{ civTwiEndTime }}</small></div>
		</div>
	</div>
	</template>
	
	<script lang="ts">
	import { defineComponent } from 'vue';
	import moment from "moment";
	import SunCalc from "suncalc";
	import define from '../../../common/define-widget';	// TODO: defineComponent版にする
	import { twemojiSvgBase } from '../../../../../misc/twemoji-base';
	import i18n from '../../../i18n';

	// See nasa-moon.ts
	const DATA = [
		{
			"u": 1641150000,
			"p": 0.09,
			"a": 0.018
		},
		{
			"u": 1643695200,
			"p": 0.18,
			"a": 0.01
		},
		{
			"u": 1646244000,
			"p": 0.18,
			"a": 0.017
		},
		{
			"u": 1648796400,
			"p": 0.09,
			"a": 0.025
		},
		{
			"u": 1651352400,
			"p": 0.01,
			"a": 0.022
		},
		{
			"u": 1653912000,
			"p": 0.02,
			"a": 0.021
		},
		{
			"u": 1656471600,
			"p": 0.1,
			"a": 0.005
		},
		{
			"u": 1659031200,
			"p": 0.18,
			"a": 0.003
		},
		{
			"u": 1661590800,
			"p": 0.17,
			"a": 0.03
		},
		{
			"u": 1664143200,
			"p": 0.09,
			"a": 0.004
		},
		{
			"u": 1666695600,
			"p": 0.01,
			"a": 0.008
		},
		{
			"u": 1669244400,
			"p": 0.02,
			"a": 0.002
		},
		{
			"u": 1671793200,
			"p": 0.12,
			"a": 0.03
		},
		{
			"u": 1674334800,
			"p": 0.19,
			"a": 0.005
		},
		{
			"u": 1676880000,
			"p": 0.16,
			"a": 0.038
		},
		{
			"u": 1679421600,
			"p": 0.06,
			"a": 0.026
		},
		{
			"u": 1681966800,
			"p": 0,
			"a": 0.033
		},
		{
			"u": 1684512000,
			"p": 0.04,
			"a": 0.005
		},
		{
			"u": 1687064400,
			"p": 0.13,
			"a": 0.016
		},
		{
			"u": 1689620400,
			"p": 0.19,
			"a": 0.02
		},
		{
			"u": 1692180000,
			"p": 0.16,
			"a": 0.015
		},
		{
			"u": 1694743200,
			"p": 0.06,
			"a": 0.014
		},
		{
			"u": 1697306400,
			"p": 0,
			"a": 0.003
		},
		{
			"u": 1699869600,
			"p": 0.04,
			"a": 0.023
		},
		{
			"u": 1702425600,
			"p": 0.14,
			"a": 0.019
		}
	];

	const widget = define({
		name: 'sunmoon',
	});
	export default defineComponent({
		extends: widget,
		i18n: i18n('common/views/widgets/sunmoon.vue'),

		data() {
			return {
				// 計算基準値
				// 計算基準値 - 年月日は後で上書き
				now: new Date(),
				year: 2000,
				month: 1,
				day: 1,

				// 計算基準値 - 緯度経度は固定
				latitude: 35,	// 緯度 (白夜/極夜でもない限りあまり関係ない)
				longitude: 140,	// 経度 (新鎌ヶ谷駅、船橋競馬場駅など)

				// 表示用
				civTwiStartTime: '00:00',	// 市民薄明開始
				sunRiseTime: '00:00',	// 日の出
				sunSetTime: '00:00',	// 日の入
				civTwiEndTime: '00:00',	// 市民薄明終了
				moonAge: '0.0',	// 月齢
				moonFace: `${twemojiSvgBase}/1f311.svg`,	// 月齢画像URL

				// 更新タイマー
				clock: undefined as unknown as NodeJS.Timer,
			};
		},

		created() {
			this.tick();
			this.clock = setInterval(this.tick, 60 * 1000);
		},

		beforeUnmount() {
			clearInterval(this.clock);
		},

		methods: {
			tick() {
				// 年月日
				const now = new Date();
				this.year = now.getFullYear();
				this.month = now.getMonth() + 1;
				this.day = now.getDate();

				// 太陽
				const sunTimes = SunCalc.getTimes(now, this.latitude, this.longitude);
				this.civTwiStartTime = moment(sunTimes.dawn).format('HH:mm');	// 市民薄明開始
				this.sunRiseTime = moment(sunTimes.sunrise).format('HH:mm');	// 日の出
				this.sunSetTime = moment(sunTimes.sunset).format('HH:mm');	// 日の入
				this.civTwiEndTime = moment(sunTimes.dusk).format('HH:mm');	// 市民薄明終了

				// 月
				const unix = now.getTime() / 1000;

				// search epoch
				let epoch: { u: number, p: number, a: number } | null = null;
				for (const data of DATA) {
					if (data.u > unix) break;
					epoch = data;
				}
				if (epoch == null) return;

				const daysAfterEpoch = (unix - epoch.u) / 86400;
				const moonAge = (epoch.a + daysAfterEpoch) % 29.530589;
				this.moonAge = moonAge.toFixed(3);

				const moonPhase = moonAge / 29.530589;

				// 月齢画像
				const moonFaceImg = ['1', '2', '3', '4', '5', '6', '7', '8'][Math.round(8 * moonPhase) % 8];
				this.moonFace = `${twemojiSvgBase}/1f31${moonFaceImg}.svg`;
			}
		}
	});
	</script>
	<style lang="stylus" scoped>
	.mkw-sunmoon {
		background: var(--face);
		border-radius 6px
		color: var(--text);
		padding: 16px 0;
		display: flex;
		justify-content: center;
		align-items: center;
		&:after {
			content: "";
		}
		> .lunar-calendar {
			float: left;
			width: 40%;
			text-align: center;
			> p {
				margin: 0;
				line-height: 18px;
				font-size: 0.9em;
			}
			> .moonface {
				line-height: 72px;
				font-size: 4em;
			}
		}
		> .suntime {
			display: block;
			float: right;
			text-align: center;
			width: 60%;
			padding: 0 16px 0 0;
			box-sizing: border-box;
			> div {
				&:last-child {
					margin-bottom: 0;
				}
				> p {
					margin: 0 0 2px 0;
					font-size: 1em;
					line-height: 18px;
				// sunrise sunset time
					> b {
						margin-left: 2px;
					}
				}
			}
		}
	}
	</style>
