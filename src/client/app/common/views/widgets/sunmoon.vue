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

	// https://svs.gsfc.nasa.gov/4955
	const DATA = [
		{
			"u": 1661990400,
			"p": 21.55,
			"a": 4.655
		},
		{
			"u": 1662076800,
			"p": 31.07,
			"a": 5.655
		},
		{
			"u": 1662163200,
			"p": 41.68,
			"a": 6.655
		},
		{
			"u": 1662249600,
			"p": 52.9,
			"a": 7.655
		},
		{
			"u": 1662336000,
			"p": 64.16,
			"a": 8.655
		},
		{
			"u": 1662422400,
			"p": 74.84,
			"a": 9.655
		},
		{
			"u": 1662508800,
			"p": 84.28,
			"a": 10.655
		},
		{
			"u": 1662595200,
			"p": 91.85,
			"a": 11.655
		},
		{
			"u": 1662681600,
			"p": 97.06,
			"a": 12.655
		},
		{
			"u": 1662768000,
			"p": 99.61,
			"a": 13.655
		},
		{
			"u": 1662854400,
			"p": 99.43,
			"a": 14.655
		},
		{
			"u": 1662940800,
			"p": 96.71,
			"a": 15.655
		},
		{
			"u": 1663027200,
			"p": 91.78,
			"a": 16.655
		},
		{
			"u": 1663113600,
			"p": 85.08,
			"a": 17.655
		},
		{
			"u": 1663200000,
			"p": 77.07,
			"a": 18.655
		},
		{
			"u": 1663286400,
			"p": 68.2,
			"a": 19.655
		},
		{
			"u": 1663372800,
			"p": 58.82,
			"a": 20.655
		},
		{
			"u": 1663459200,
			"p": 49.29,
			"a": 21.655
		},
		{
			"u": 1663545600,
			"p": 39.87,
			"a": 22.655
		},
		{
			"u": 1663632000,
			"p": 30.85,
			"a": 23.655
		},
		{
			"u": 1663718400,
			"p": 22.47,
			"a": 24.655
		},
		{
			"u": 1663804800,
			"p": 15.01,
			"a": 25.655
		},
		{
			"u": 1663891200,
			"p": 8.76,
			"a": 26.655
		},
		{
			"u": 1663977600,
			"p": 4,
			"a": 27.655
		},
		{
			"u": 1664064000,
			"p": 1.03,
			"a": 28.655
		},
		{
			"u": 1664150400,
			"p": 0.09,
			"a": 0.087
		},
		{
			"u": 1664236800,
			"p": 1.37,
			"a": 1.087
		},
		{
			"u": 1664323200,
			"p": 4.93,
			"a": 2.087
		},
		{
			"u": 1664409600,
			"p": 10.71,
			"a": 3.087
		},
		{
			"u": 1664496000,
			"p": 18.51,
			"a": 4.087
		},
		{
			"u": 1664582400,
			"p": 27.99,
			"a": 5.087
		},
		{
			"u": 1664668800,
			"p": 38.67,
			"a": 6.087
		},
		{
			"u": 1664755200,
			"p": 50.01,
			"a": 7.087
		},
		{
			"u": 1664841600,
			"p": 61.41,
			"a": 8.087
		},
		{
			"u": 1664928000,
			"p": 72.23,
			"a": 9.087
		},
		{
			"u": 1665014400,
			"p": 81.87,
			"a": 10.087
		},
		{
			"u": 1665100800,
			"p": 89.8,
			"a": 11.087
		},
		{
			"u": 1665187200,
			"p": 95.59,
			"a": 12.087
		},
		{
			"u": 1665273600,
			"p": 99,
			"a": 13.087
		},
		{
			"u": 1665360000,
			"p": 99.94,
			"a": 14.087
		},
		{
			"u": 1665446400,
			"p": 98.52,
			"a": 15.087
		},
		{
			"u": 1665532800,
			"p": 94.97,
			"a": 16.087
		},
		{
			"u": 1665619200,
			"p": 89.61,
			"a": 17.087
		},
		{
			"u": 1665705600,
			"p": 82.78,
			"a": 18.087
		},
		{
			"u": 1665792000,
			"p": 74.85,
			"a": 19.087
		},
		{
			"u": 1665878400,
			"p": 66.12,
			"a": 20.087
		},
		{
			"u": 1665964800,
			"p": 56.91,
			"a": 21.087
		},
		{
			"u": 1666051200,
			"p": 47.48,
			"a": 22.087
		},
		{
			"u": 1666137600,
			"p": 38.09,
			"a": 23.087
		},
		{
			"u": 1666224000,
			"p": 29.02,
			"a": 24.087
		},
		{
			"u": 1666310400,
			"p": 20.58,
			"a": 25.087
		},
		{
			"u": 1666396800,
			"p": 13.1,
			"a": 26.087
		},
		{
			"u": 1666483200,
			"p": 6.96,
			"a": 27.087
		},
		{
			"u": 1666569600,
			"p": 2.56,
			"a": 28.087
		},
		{
			"u": 1666656000,
			"p": 0.27,
			"a": 29.087
		},
		{
			"u": 1666742400,
			"p": 0.38,
			"a": 0.55
		},
		{
			"u": 1666828800,
			"p": 3.05,
			"a": 1.55
		},
		{
			"u": 1666915200,
			"p": 8.23,
			"a": 2.55
		},
		{
			"u": 1667001600,
			"p": 15.7,
			"a": 3.55
		},
		{
			"u": 1667088000,
			"p": 25.02,
			"a": 4.55
		},
		{
			"u": 1667174400,
			"p": 35.65,
			"a": 5.55
		},
		{
			"u": 1667260800,
			"p": 46.97,
			"a": 6.55
		},
		{
			"u": 1667347200,
			"p": 58.34,
			"a": 7.55
		},
		{
			"u": 1667433600,
			"p": 69.16,
			"a": 8.55
		},
		{
			"u": 1667520000,
			"p": 78.9,
			"a": 9.55
		},
		{
			"u": 1667606400,
			"p": 87.11,
			"a": 10.55
		},
		{
			"u": 1667692800,
			"p": 93.45,
			"a": 11.55
		},
		{
			"u": 1667779200,
			"p": 97.71,
			"a": 12.55
		},
		{
			"u": 1667865600,
			"p": 99.78,
			"a": 13.55
		},
		{
			"u": 1667952000,
			"p": 99.69,
			"a": 14.55
		},
		{
			"u": 1668038400,
			"p": 97.58,
			"a": 15.55
		},
		{
			"u": 1668124800,
			"p": 93.65,
			"a": 16.55
		},
		{
			"u": 1668211200,
			"p": 88.14,
			"a": 17.55
		},
		{
			"u": 1668297600,
			"p": 81.31,
			"a": 18.55
		},
		{
			"u": 1668384000,
			"p": 73.42,
			"a": 19.55
		},
		{
			"u": 1668470400,
			"p": 64.72,
			"a": 20.55
		},
		{
			"u": 1668556800,
			"p": 55.47,
			"a": 21.55
		},
		{
			"u": 1668643200,
			"p": 45.91,
			"a": 22.55
		},
		{
			"u": 1668729600,
			"p": 36.32,
			"a": 23.55
		},
		{
			"u": 1668816000,
			"p": 27.02,
			"a": 24.55
		},
		{
			"u": 1668902400,
			"p": 18.4,
			"a": 25.55
		},
		{
			"u": 1668988800,
			"p": 10.89,
			"a": 26.55
		},
		{
			"u": 1669075200,
			"p": 5.01,
			"a": 27.55
		},
		{
			"u": 1669161600,
			"p": 1.24,
			"a": 28.55
		},
		{
			"u": 1669248000,
			"p": 0.02,
			"a": 0.044
		},
		{
			"u": 1669334400,
			"p": 1.6,
			"a": 1.044
		},
		{
			"u": 1669420800,
			"p": 5.97,
			"a": 2.044
		},
		{
			"u": 1669507200,
			"p": 12.88,
			"a": 3.044
		},
		{
			"u": 1669593600,
			"p": 21.83,
			"a": 4.044
		},
		{
			"u": 1669680000,
			"p": 32.19,
			"a": 5.044
		},
		{
			"u": 1669766400,
			"p": 43.29,
			"a": 6.044
		},
		{
			"u": 1669852800,
			"p": 54.48,
			"a": 7.044
		},
		{
			"u": 1669939200,
			"p": 65.21,
			"a": 8.044
		},
		{
			"u": 1670025600,
			"p": 75,
			"a": 9.044
		},
		{
			"u": 1670112000,
			"p": 83.49,
			"a": 10.044
		},
		{
			"u": 1670198400,
			"p": 90.38,
			"a": 11.044
		},
		{
			"u": 1670284800,
			"p": 95.47,
			"a": 12.044
		},
		{
			"u": 1670371200,
			"p": 98.67,
			"a": 13.044
		},
		{
			"u": 1670457600,
			"p": 99.92,
			"a": 14.044
		},
		{
			"u": 1670544000,
			"p": 99.27,
			"a": 15.044
		},
		{
			"u": 1670630400,
			"p": 96.81,
			"a": 16.044
		},
		{
			"u": 1670716800,
			"p": 92.69,
			"a": 17.044
		},
		{
			"u": 1670803200,
			"p": 87.08,
			"a": 18.044
		},
		{
			"u": 1670889600,
			"p": 80.18,
			"a": 19.044
		},
		{
			"u": 1670976000,
			"p": 72.18,
			"a": 20.044
		},
		{
			"u": 1671062400,
			"p": 63.31,
			"a": 21.044
		},
		{
			"u": 1671148800,
			"p": 53.79,
			"a": 22.044
		},
		{
			"u": 1671235200,
			"p": 43.89,
			"a": 23.044
		},
		{
			"u": 1671321600,
			"p": 33.94,
			"a": 24.044
		},
		{
			"u": 1671408000,
			"p": 24.35,
			"a": 25.044
		},
		{
			"u": 1671494400,
			"p": 15.6,
			"a": 26.044
		},
		{
			"u": 1671580800,
			"p": 8.3,
			"a": 27.044
		},
		{
			"u": 1671667200,
			"p": 3.04,
			"a": 28.044
		},
		{
			"u": 1671753600,
			"p": 0.37,
			"a": 29.044
		},
		{
			"u": 1671840000,
			"p": 0.64,
			"a": 0.572
		},
		{
			"u": 1671926400,
			"p": 3.92,
			"a": 1.572
		},
		{
			"u": 1672012800,
			"p": 9.94,
			"a": 2.572
		},
		{
			"u": 1672099200,
			"p": 18.19,
			"a": 3.572
		},
		{
			"u": 1672185600,
			"p": 27.99,
			"a": 4.572
		},
		{
			"u": 1672272000,
			"p": 38.65,
			"a": 5.572
		},
		{
			"u": 1672358400,
			"p": 49.53,
			"a": 6.572
		},
		{
			"u": 1672444800,
			"p": 60.1,
			"a": 7.572
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
