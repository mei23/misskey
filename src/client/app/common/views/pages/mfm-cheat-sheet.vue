<template>
<ui-card style="margin: 1em auto">
	<template #title><fa :icon="faQuestionCircle"/> 文字装飾チートシート</template>

	<details style="padding: 0 32px 8px 32px">
		<summary style="padding: 16px 0; cursor: pointer">Playground</summary>
		<section>
			<ui-textarea :slim="false" class="text" v-model="playground"></ui-textarea>
			<p><mfm :text="playground" :key="playground"/></p>
			<highlightjs v-if="parsed" :language="json" :code="parsed"/>
		</section>
	</details>

	<section>
		<header>メンション</header>
		<p>特定のユーザーを示すことができます。</p>
		<p><mfm :text="preview_mention" :key="preview_mention"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_mention"></ui-textarea>
	</section>

	<section>
		<header>ハッシュタグ</header>
		<p>ハッシュタグを示すことができます。</p>
		<p><mfm :text="preview_hashtag" :key="preview_hashtag"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_hashtag"></ui-textarea>
	</section>

	<section>
		<header>URL</header>
		<p>URLを記述するとリンクになります。</p>
		<p><mfm :text="preview_url" :key="preview_url"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_url"></ui-textarea>
	</section>

	<section>
		<header>リンク</header>
		<p>ラベル付きでURLにリンクすることができます。</p>
		<p><mfm :text="preview_link" :key="preview_link"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_link"></ui-textarea>
	</section>

	<section>
		<header>カスタム絵文字</header>
		<p>:でカスタム絵文字名を囲むと、カスタム絵文字を表示させることができます。インスタンス内に取得されていれば、リモートカスタム絵文字も表示することができます。</p>
		<p><mfm :text="preview_emoji" :key="preview_emoji"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_emoji"></ui-textarea>
	</section>

	<section>
		<header>アバター絵文字</header>
		<p>:でユーザーIDを囲むと、そのユーザーのアバターを表示させることができます。インスタンス内に取得されていれば、リモートカスタムも表示することができます。</p>
		<p><mfm :text="preview_avatar" :key="preview_avatar"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_avatar"></ui-textarea>
	</section>

	<section>
		<header>太字</header>
		<p>文字を太字にすることができます。</p>
		<p><mfm :text="preview_bold" :key="preview_bold"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_bold"></ui-textarea>
	</section>

	<section>
		<header>小さく目立たなく</header>
		<p>文字を小さく目立たなくすることができます。</p>
		<p><mfm :text="preview_small" :key="preview_small"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_small"></ui-textarea>
	</section>

	<section>
		<header>イタリック</header>
		<p>文字を斜体にすることが出来ます。</p>
		<p><mfm :text="preview_italic" :key="preview_italic"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_italic"></ui-textarea>
	</section>

	<section>
		<header>上付き・下付き</header>
		<p><mfm :text="preview_supsub" :key="preview_supsub"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_supsub"></ui-textarea>
	</section>

	<section>
		<header>打ち消し線</header>
		<p>文字に打ち消し線を付けることができます。</p>
		<p><mfm :text="preview_strike" :key="preview_strike"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_strike"></ui-textarea>
	</section>

	<section>
		<header>色</header>
		<p>前景色と背景色を付けることが出来ます</p>
		<p><mfm :text="preview_color" :key="preview_color"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_color"></ui-textarea>
	</section>

	<section>
		<header>引用 (ブロック要素)</header>
		<p>引用を示すことができます。</p>
		<p><mfm :text="preview_quote" :key="preview_quote"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_quote"></ui-textarea>
	</section>

	<section>
		<header>中央寄せ (ブロック要素)</header>
		<p>中央寄せで表示することができます。</p>
		<p><mfm :text="preview_center" :key="preview_center"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_center"></ui-textarea>
	</section>

	<section>
		<header>インラインコード</header>
		<p>ソースコードなどをインラインでシンタックスハイライトします。</p>
		<p><mfm :text="preview_inlineCode" :key="preview_inlineCode"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_inlineCode"></ui-textarea>
	</section>

	<section>
		<header>コードブロック (ブロック要素)</header>
		<p>ソースコードなどをブロックでシンタックスハイライトします。言語指定も出来ます。</p>
		<p><mfm :text="preview_blockCode" :key="preview_blockCode"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_blockCode"></ui-textarea>
	</section>

	<section>
		<header>タイトル (ブロック要素)</header>
		<p>タイトルのようになります</p>
		<p><mfm :text="preview_title" :key="preview_title"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_title"></ui-textarea>
	</section>

	<section>
		<header>アニメーション</header>
		<p>いろんなアニメーションをすることができます</p>
		<p><mfm :text="preview_anime1" :key="preview_anime1"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_anime1"></ui-textarea>
	</section>

	<section>
		<header>大きく</header>
		<p><mfm :text="preview_x" :key="preview_anime1"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_x"></ui-textarea>
	</section>

	<section>
		<header>色ずれアニメーション</header>
		<p><mfm :text="preview_rgbshift" :key="preview_rgbshift"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_rgbshift"></ui-textarea>
	</section>

	<section>
		<header>左右反転・上下反転・双方反転</header>
		<p><mfm :text="preview_flip" :key="preview_flip"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_flip"></ui-textarea>
	</section>

	<section>
		<header>回転</header>
		<p><mfm :text="preview_spin" :key="preview_spin"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_spin"></ui-textarea>
	</section>
	<section>
		<header>X軸回転</header>
		<p><mfm :text="preview_xspin" :key="preview_xspin"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_xspin"></ui-textarea>
	</section>
	<section>
		<header>Y軸回転</header>
		<p><mfm :text="preview_yspin" :key="preview_yspin"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_yspin"></ui-textarea>
	</section>

	<section>
		<header>指定角度回転</header>
		<p><mfm :text="preview_rotate" :key="preview_rotate"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_rotate"></ui-textarea>
	</section>

	<section>
		<header>マーキー (ブロック要素)</header>
		<p><mfm :text="preview_marquee" :key="preview_marquee"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_marquee"></ui-textarea>
	</section>

	<section>
		<header>インライン数式</header>
		<p>数式 (KaTeX)をインラインで表示します。</p>
		<p><mfm :text="preview_inlineMath" :key="preview_inlineMath"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_inlineMath"></ui-textarea>
	</section>

	<section>
		<header>ブロック数式 (ブロック要素)</header>
		<p>数式 (KaTeX)をブロックで表示します。</p>
		<p><mfm :text="preview_blockMath" :key="preview_blockMath"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_blockMath"></ui-textarea>
	</section>

	<section>
		<header>検索 (ブロック要素)</header>
		<p>入力済み検索ボックスを表示させることができます。</p>
		<p><mfm :text="preview_search" :key="preview_search"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_search"></ui-textarea>
	</section>

	<section>
		<header>fn系アニメーション</header>
		<p>fn系はv12の[]でくくるアニメーションです。既出分と似た分。</p>
		<p><mfm :text="preview_fn1" :key="preview_fn1"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_fn1"></ui-textarea>
	</section>

	<section>
		<header>fn系反転</header>
		<p><mfm :text="preview_fnFlip" :key="preview_fnFlip"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_fnFlip"></ui-textarea>
	</section>

	<section>
		<header>fn系回転</header>
		<p><mfm :text="preview_fnSpin" :key="preview_fnSpin"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_fnSpin"></ui-textarea>
	</section>

	<section>
		<header>fn系speed</header>
		<p>fn系の一部は1ループの速度調整ができます。なお、fn系同士ではネストができません。</p>
		<p><mfm :text="preview_fnSpeed" :key="preview_fnSpeed"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_fnSpeed"></ui-textarea>
	</section>

	<section>
		<header>fn系delay</header>
		<p>fn系の一部はループの開始タイミングを調整できます。</p>
		<p><mfm :text="preview_fnDelay" :key="preview_fnDelay"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_fnDelay"></ui-textarea>
	</section>

	<section>
		<header>fn系拡大</header>
		<p><mfm :text="preview_fnX" :key="preview_fnX"/></p>
		<ui-textarea :slim="false" class="text" v-model="preview_fnX"></ui-textarea>
	</section>

	<section>
		<header>fn系blur</header>
		<p>ぼかしです、マウスオーバーで表示します。</p>
		<p><mfm :text="preview_blur" :key="preview_blur"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_blur"></ui-textarea>
	</section>

	<section>
		<header>fn系font</header>
		<p><mfm :text="preview_font" :key="preview_font"/></p>
		<ui-textarea :slim="true" class="text" v-model="preview_font"></ui-textarea>
	</section>
</ui-card>

</template>

<script lang="ts">
import Vue from 'vue';
import i18n from '../../../i18n';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';
import { parseFull } from '../../../../../mfm/parse';

export default Vue.extend({
	i18n: i18n(''),

	data() {
		return {
			playground: '',
			preview_mention: '@example\n@example@example.com',
			preview_hashtag: '#test\n\#Misskeyならこれもタグにできちゃいます🍊',
			preview_url: `https://example.com\n<https://example.com/エスケープされてないもの>`,
			preview_link: `[MisskeyでFediverseの世界が広がります](https://example.com)\n[MisskeyでFediverseの世界が広がります](<https://example.com/エスケープされてないもの>)\n?[詳細展開なしリンク](https://example.com)`,
			preview_emoji: `:emoji: :emoji@example.com:`,
			preview_avatar: ':@user: :@user@example.com:',
			preview_bold: '**太字**\n__abc__ \`// [0-9A-Za-z]にのみ効く見なかったことにしたい記法\`',
			preview_small: `<small>小さくなります</small>`,
			preview_italic: '<i>これは斜体</i>\n_a先頭がアルファベットとかと接着してれば斜体になる構文_\n*a先頭がアルファベットとかと接着してれば斜体になる構文*',
			preview_strike: '~~環境によって意味が変わるとかめんどくさいこと言われる打ち消し線です~~',
			preview_color: '<color #0000ff lightpink>前景色と背景色</color>',
			preview_supsub: '上付き<sup>a</sup>\n下付き<sub>b</sub>',
			preview_quote: `> これは引用です`,
			preview_center: `<center>中央に</center>`,
			preview_inlineCode: '`a ? 1 : 0`',
			preview_blockCode: '```\nconst a = 1;\n```\n```html\n<!doctype html><html><head><body></body></html>\n```',
			preview_inlineMath: '\\(x= \\frac{-b\' \\pm \\sqrt{(b\')^2-ac}}{a}\\)',
			preview_blockMath: '\\[\nx= \\frac{-b\' \\pm \\sqrt{(b\')^2-ac}}{a}\n\\]',
			preview_search: `MisskeyでFediverseの世界が広がります 検索`,
			preview_title: `【タイトル】`,
			preview_anime1: `<motion>モーション</motion>\n*** ビッグ＋ ***\n**** ビッグ＋＋ ****\n<jump>ジャンプ</jump>\n<blink>blink</blink> <twitch>twitch</twitch> <shake>shake</shake>`,
			preview_x: `<x1>🍮</x1>\n<x2>🍮</x2>\n<x3>🍮</x3>\n<x4>🍮</x4>\n`,
			preview_flip: '<flip>左右反転</flip>\n<vflip>上下反転</vflip>\n<flip><vflip>双方反転</vflip></flip>',
			preview_spin: '<spin>回転</spin> <spin left>左回転</spin> <spin alternate>往復回転</spin>',
			preview_xspin: '<xspin>回転</xspin> <xspin left>左回転</xspin> <xspin alternate>往復回転</xspin>',
			preview_yspin: '<yspin>回転</yspin> <yspin left>左回転</yspin> <yspin alternate>往復回転</yspin>',
			preview_rotate: '<rotate 30>指定角度回転</rotate>',
			preview_marquee: '<marquee>マーキー (右から左へ)</marquee>\n<marquee reverse>マーキー (左から右へ)</marquee>\n<marquee alternate>マーキー (往復)</marquee>\n<marquee slide>マーキー (右から出てきて左で停止)</marquee>\n<marquee reverse-slide>マーキー (左から出てきて右で停止)</marquee>',
			preview_fn1: '$[jelly 🍣] びよんびよん motionに同じ\n'
				+ '$[tada 🍣] じゃーん 太字にならないビッグ＋に同じ\n'
				+ '$[jump 🍣] ジャンプ jump同じ\n'
				+ '$[bounce 🍣] バウンド\n'
				+ '$[shake 🍣] ぶるぶる\n'
				+ '$[twitch 🍣] ブレ',
			preview_fnFlip: '$[flip MisskeyでFediverseの世界が広がります]\n$[flip.v MisskeyでFediverseの世界が広がります]\n$[flip.h,v MisskeyでFediverseの世界が広がります]',
			preview_fnSpin: '$[spin あいう] $[spin.left あいう] $[spin.alternate あいう]\n$[spin.x あいう] $[spin.x,left あいう] $[spin.x,alternate あいう]\n$[spin.y あいう] $[spin.y,left あいう] $[spin.y,alternate あいう]',
			preview_fnSpeed: '$[spin.y,left,speed=1s あいう]\n$[spin.y,left,speed=2s あいう]\n$[spin.y,left,speed=3s あいう]',
			preview_fnDelay: '$[spin.y,left,speed=1s,delay=0.1s あいう]\n$[spin.y,left,speed=1s,delay=0.2s あいう]\n$[spin.y,left,speed=1s,delay=0.3s あいう]',
			preview_rgbshift: '<rgbshift>色ずれアニメーション効果です</rgbshift>',
			preview_fnX: '$[x1 あいう]\n$[x2 あいう]\n$[x3 あいう]\n$[x4 あいう]',
			preview_blur: '$[blur あいう]',
			preview_font: '$[font.serif serif]\n$[font.monospace monospace]',

			faQuestionCircle
		};
	},

	computed: {
		parsed(): string {
			if (!this.playground) return '';
			const nodes = parseFull(this.playground) || [];
			return JSON.stringify(nodes, null, 2);
		}
	},
});
</script>

<style lang="stylus" scoped>
.text
	margin 0 !important
</style>
