import Vue, { VNode } from 'vue';
import { length } from 'stringz';
import { MfmForest } from '../../../../../mfm/prelude';
import { parse, parsePlain, parsePlainX } from '../../../../../mfm/parse';
import MkUrl from './url.vue';
import MkMention from './mention.vue';
import { concat, sum } from '../../../../../prelude/array';
import MkFormula from './formula.vue';
import MkCode from './code.vue';
import MkGoogle from './google.vue';
import { host } from '../../../config';
import { preorderF, countNodesF } from '../../../../../prelude/tree';

function sumTextsLength(ts: MfmForest): number {
	const textNodes = preorderF(ts).filter(n => n.type === 'text');
	return sum(textNodes.map(x => length(x.props.text)));
}

export default Vue.component('misskey-flavored-markdown', {
	props: {
		text: {
			type: String,
			required: true
		},
		plain: {
			type: Boolean,
			default: false
		},
		extra: {
			type: Boolean,
			default: false
		},
		nowrap: {
			type: Boolean,
			default: false
		},
		author: {
			type: Object,
			default: null
		},
		i: {
			type: Object,
			default: null
		},
		customEmojis: {
			required: false,
		},
		isNote: {
			type: Boolean,
			default: true
		},
	},

	render(createElement) {
		if (this.text == null || this.text == '') return;

		const ast = (this.plain ? this.extra ? parsePlainX : parsePlain : parse)(this.text);

		let bigCount = 0;
		let motionCount = 0;

		const validTime = (t: string | null | undefined) => {
			if (t == null) return null;
			return t.match(/^[0-9.]+s$/) ? t : null;
		}

		const genEl = (ast: MfmForest, inQuote?: string) => concat(ast.map((token): VNode[] => {
			switch (token.node.type) {
				case 'text': {
					const text = token.node.props.text.replace(/(\r\n|\n|\r)/g, '\n');

					if (!this.plain) {
						const x = text.split('\n')
							.map(t => t == '' ? [createElement('br')] : [createElement('span', t), createElement('br')]);
						x[x.length - 1].pop();
						return x;
					} else {
						return [createElement('span', text.replace(/\n/g, ' '))];
					}
				}

				case 'bold': {
					return [createElement('b', genEl(token.children, inQuote))];
				}

				case 'strike': {
					return [createElement('del', genEl(token.children, inQuote))];
				}

				case 'italic': {
					return (createElement as any)('i', {
						attrs: {
							style: 'font-style: oblique;'
						},
					}, genEl(token.children, inQuote));
				}

				case 'big': {
					bigCount++;
					const isLong = sumTextsLength(token.children) > 100 || countNodesF(token.children) > 20;
					const isMany = bigCount > 50;
					return (createElement as any)('strong', {
						attrs: {
							style: `display: inline-block; font-size: ${ isMany ? '100%' : '150%' };`
						},
						directives: [this.$store.state.settings.disableAnimatedMfm || isLong || isMany ? {} : {
							name: 'animate-css',
							value: { classes: 'tada', iteration: 'infinite' }
						}]
					}, genEl(token.children, inQuote));
				}

				case 'fn': {
					// TODO: CSSを文字列で組み立てていくと token.node.props.args.~~~ 経由でCSSインジェクションできるのでよしなにやる
					let style;
					switch (token.node.props.name) {
						case 'tada': {
							style = `font-size: 150%;` + (!this.$store.state.settings.disableAnimatedMfm ? 'animation: tada 1s linear infinite both;' : '');
							break;
						}
						case 'jelly': {
							const speed = validTime(token.node.props.args.speed) || '1s';
							style = (!this.$store.state.settings.disableAnimatedMfm ? `animation: mfm-rubberBand ${speed} linear infinite both;` : '');
							break;
						}
						case 'twitch': {
							const speed = validTime(token.node.props.args.speed) || '0.5s';
							style = !this.$store.state.settings.disableAnimatedMfm ? `animation: mfm-twitch ${speed} ease infinite;` : '';
							break;
						}
						case 'shake': {
							const speed = validTime(token.node.props.args.speed) || '0.5s';
							style = !this.$store.state.settings.disableAnimatedMfm ? `animation: mfm-shake ${speed} ease infinite;` : '';
							break;
						}
						case 'spin': {
							const direction =
								token.node.props.args.left ? 'reverse' :
								token.node.props.args.alternate ? 'alternate' :
								'normal';
							const anime =
								token.node.props.args.x ? 'mfm-spinX' :
								token.node.props.args.y ? 'mfm-spinY' :
								'mfm-spin';
							const speed = validTime(token.node.props.args.speed) || '1.5s';
							const delay = validTime(token.node.props.args.delay) || '0s';
							style = !this.$store.state.settings.disableAnimatedMfm ? `animation: ${anime} ${speed} ${delay} linear infinite; animation-direction: ${direction};` : '';
							break;
						}
						case 'jump': {
							style = !this.$store.state.settings.disableAnimatedMfm ? 'animation: mfm-jump 0.75s linear infinite;' : '';
							break;
						}
						case 'bounce': {
							style = !this.$store.state.settings.disableAnimatedMfm ? 'animation: mfm-bounce 0.75s linear infinite; transform-origin: center bottom;' : '';
							break;
						}
						case 'flip': {
							const transform =
								(token.node.props.args.h && token.node.props.args.v) ? 'scale(-1, -1)' :
								token.node.props.args.v ? 'scaleY(-1)' :
								'scaleX(-1)';
							style = `transform: ${transform};`;
							break;
						}
						case 'rgbshift': {
							style = !this.$store.state.settings.disableAnimatedMfm ? 'animation: mfm-rgbshift 2s linear infinite;' : '';
							break;
						}
					}

					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(token.children, inQuote));
				}

				case 'small': {
					return [createElement('small', {
						attrs: {
							style: 'opacity: 0.7;'
						},
					}, genEl(token.children, inQuote))];
				}

				case 'center': {
					return [createElement('div', {
						attrs: {
							style: 'text-align:center;'
						}
					}, genEl(token.children, inQuote))];
				}

				case 'motion': {
					motionCount++;
					const isLong = sumTextsLength(token.children) > 100 || countNodesF(token.children) > 20;
					const isMany = motionCount > 50;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;'
						},
						directives: [this.$store.state.settings.disableAnimatedMfm || isLong || isMany ? {} : {
							name: 'animate-css',
							value: { classes: 'rubberBand', iteration: 'infinite' }
						}]
					}, genEl(token.children, inQuote));
				}

				case 'spin': {
					motionCount++;
					const isLong = sumTextsLength(token.children) > 100 || countNodesF(token.children) > 20;
					const isMany = motionCount > 50;
					const direction =
						token.node.props.attr == 'left' ? 'reverse' :
						token.node.props.attr == 'alternate' ? 'alternate' :
						'normal';
					const style = (this.$store.state.settings.disableAnimatedMfm || isLong || isMany)
						? ''
						: `animation: spin 1.5s linear infinite; animation-direction: ${direction};`;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(token.children, inQuote));
				}

				case 'xspin': {
					motionCount++;
					const isLong = sumTextsLength(token.children) > 100 || countNodesF(token.children) > 20;
					const isMany = motionCount > 50;
					const direction =
						token.node.props.attr == 'left' ? 'reverse' :
						token.node.props.attr == 'alternate' ? 'alternate' :
						'normal';
					const style = (this.$store.state.settings.disableAnimatedMfm || isLong || isMany)
						? ''
						: `animation: xspin 1.5s linear infinite; animation-direction: ${direction};`;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(token.children, inQuote));
				}

				case 'yspin': {
					motionCount++;
					const isLong = sumTextsLength(token.children) > 100 || countNodesF(token.children) > 20;
					const isMany = motionCount > 50;
					const direction =
						token.node.props.attr == 'left' ? 'reverse' :
						token.node.props.attr == 'alternate' ? 'alternate' :
						'normal';
					const style = (this.$store.state.settings.disableAnimatedMfm || isLong || isMany)
						? ''
						: `animation: yspin 1.5s linear infinite; animation-direction: ${direction};`;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(token.children, inQuote));
				}

				case 'jump': {
					motionCount++;
					const isLong = sumTextsLength(token.children) > 100 || countNodesF(token.children) > 20;
					const isMany = motionCount > 50;
					return (createElement as any)('span', {
						attrs: {
							style: (this.$store.state.settings.disableAnimatedMfm || isLong || isMany) ? 'display: inline-block;' : 'display: inline-block; animation: jump 0.75s linear infinite;'
						},
					}, genEl(token.children, inQuote));
				}

				case 'flip': {
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block; transform: scaleX(-1);'
						},
					}, genEl(token.children, inQuote));
				}

				case 'vflip': {
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block; transform: scaleY(-1);'
						},
					}, genEl(token.children, inQuote));
				}

				case 'rotate': {
					const isLong = sumTextsLength(token.children) > 100 || countNodesF(token.children) > 20;
					const deg = token.node.props.attr;

					return (createElement as any)('span', {
						attrs: {
							style: isLong ? '' : `display: inline-block; transform: rotate(${deg}deg);`
						},
					}, genEl(token.children, inQuote));
				}

				case 'url': {
					return [createElement(MkUrl, {
						key: Math.random(),
						props: {
							url: token.node.props.url,
							rel: 'nofollow noopener',
							target: '_blank',
							trim: true
						},
						attrs: {
							style: 'color:var(--mfmUrl);'
						}
					})];
				}

				case 'link': {
					return [createElement('a', {
						attrs: {
							class: 'link',
							href: token.node.props.url,
							rel: 'nofollow noopener',
							target: '_blank',
							title: token.node.props.url,
							style: 'color:var(--mfmLink);'
						}
					}, genEl(token.children, inQuote))];
				}

				case 'mention': {
					return [createElement(MkMention, {
						key: Math.random(),
						props: {
							customEmojis: this.customEmojis,
							host: (token.node.props.host == null && this.author && this.author.host != null ? this.author.host : token.node.props.host) || host,
							username: token.node.props.username
						}
					})];
				}

				case 'hashtag': {
					return [createElement('router-link', {
						key: Math.random(),
						attrs: {
							to: this.isNote ? `/tags/${encodeURIComponent(token.node.props.hashtag)}` : `/explore/tags/${encodeURIComponent(token.node.props.hashtag)}`,
							style: 'color:var(--mfmHashtag);'
						}
					}, `#${token.node.props.hashtag}`)];
				}

				case 'blockCode': {
					return [createElement(MkCode, {
						key: Math.random(),
						props: {
							code: token.node.props.code,
							lang: token.node.props.lang,
						}
					})];
				}

				case 'inlineCode': {
					return [createElement(MkCode, {
						key: Math.random(),
						props: {
							code: token.node.props.code,
							lang: token.node.props.lang,
							inline: true
						}
					})];
				}

				case 'quote': {
					if (this.shouldBreak) {
						return [createElement('div', {
							attrs: {
								class: 'quote'
							}
						}, genEl(token.children, 'quote'))];
					} else {
						return [createElement('span', {
							attrs: {
								class: 'quote'
							}
						}, genEl(token.children, 'quote'))];
					}
				}

				case 'title': {
					return [createElement('div', {
						attrs: {
							class: 'title'
						}
					}, genEl(token.children, inQuote))];
				}

				case 'emoji': {
					const customEmojis = (this.$root.getMetaSync() || { emojis: [] }).emojis || [];
					return [createElement('mk-emoji', {
						key: Math.random(),
						attrs: {
							emoji: token.node.props.emoji,
							name: token.node.props.name,
							vendor: token.node.props.vendor,
							local: token.node.props.local,
						},
						props: {
							customEmojis: this.customEmojis || customEmojis,
							normal: this.plain
						}
					})];
				}

				case 'mathInline': {
					//const MkFormula = () => import('./formula.vue').then(m => m.default);
					return [createElement(MkFormula, {
						key: Math.random(),
						props: {
							formula: token.node.props.formula,
							block: false
						}
					})];
				}

				case 'mathBlock': {
					//const MkFormula = () => import('./formula.vue').then(m => m.default);
					return [createElement(MkFormula, {
						key: Math.random(),
						props: {
							formula: token.node.props.formula,
							block: true
						}
					})];
				}

				case 'search': {
					//const MkGoogle = () => import('./google.vue').then(m => m.default);
					return [createElement(MkGoogle, {
						key: Math.random(),
						props: {
							q: token.node.props.query
						}
					})];
				}

				case 'marquee': {
					if (this.$store.state.settings.disableAnimatedMfm) {
						return genEl(token.children, inQuote);
					}

					let behavior = 'scroll';
					let direction = 'left';
					let scrollamount = '5';

					if (token.node.props.attr === 'reverse') {
						direction = 'right';
					} else if (token.node.props.attr === 'alternate') {
						behavior = 'alternate';
						scrollamount = '10';
					} else if (token.node.props.attr === 'slide') {
						behavior = 'slide';
					} else if (token.node.props.attr === 'reverse-slide') {
						direction = 'right';
						behavior = 'slide';
					}

					return [createElement('marquee', {
							attrs: {
								behavior,
								direction,
								scrolldelay: '60',
								scrollamount,
							}
						}, genEl(token.children, inQuote)),
					];
				}

				default: {
					console.log('unknown ast type:', token.node.type);

					return [];
				}
			}
		}));

		// Parse ast to DOM
		return createElement('span', genEl(ast));
	}
});
