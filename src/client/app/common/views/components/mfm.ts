import Vue, { VNode } from 'vue';
import { MfmNode } from '../../../../../mfm/types';
import { parseFull, parsePlain, parsePlainX, parseBasic } from '../../../../../mfm/parse';
import MkUrl from './url.vue';
import MkMention from './mention.vue';
import { concat } from '../../../../../prelude/array';
import MkFormula from './formula.vue';
import MkCode from './code.vue';
import MkGoogle from './google.vue';
import { host } from '../../../config';
import { normalizeTag } from '../../../../../misc/normalize-tag';

export default Vue.component('misskey-flavored-markdown', {
	props: {
		text: {
			type: String,
			required: true
		},
		// plain扱い (絵文字のみ)
		plain: {
			type: Boolean,
			default: false
		},
		// plain扱いだけどインライン装飾も許可
		extra: {
			type: Boolean,
			default: false
		},
		basic: {
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
		hashtags: {
			type: Array,
			required: false,
			default: null
		},
		isNote: {
			type: Boolean,
			default: true
		},
		direction: {
			type: String,
			default: 'none'
		},
	},

	render(createElement) {
		if (this.text == null || this.text == '') return;

		const ast = (this.basic ? parseBasic : this.plain ? this.extra ? parsePlainX : parsePlain : parseFull)(this.text);

		let bigCount = 0;
		let motionCount = 0;

		const validTime = (t: string | null | undefined) => {
			if (t == null) return null;
			return t.match(/^[0-9.]+s$/) ? t : null;
		}

		const genEl = (nodes: MfmNode[], inQuote?: string) => concat(nodes.map((node): VNode[] => {
			switch (node.type) {
				case 'text': {
					const text = node.props.text.replace(/(\r\n|\n|\r)/g, '\n');

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
					return [createElement('b', genEl(node.children, inQuote))];
				}

				case 'strike': {
					return [createElement('del', genEl(node.children, inQuote))];
				}

				case 'italic': {
					return (createElement as any)('i', {
						attrs: {
							style: 'font-style: oblique;'
						},
					}, genEl(node.children, inQuote));
				}

				case 'sup': {
					return (createElement as any)('sup', {
						attrs: {
							style: 'vertical-align: super; font-size: smaller;'
						},
					}, genEl(node.children));
				}

				case 'sub': {
					return (createElement as any)('sub', {
						attrs: {
							style: 'vertical-align: sub; font-size: smaller;'
						},
					}, genEl(node.children));
				}

				case 'big': {
					bigCount++;
					const isMany = bigCount > 50;
					return (createElement as any)('strong', {
						attrs: {
							style: `display: inline-block; font-size: ${ isMany ? '100%' : '150%' };`
						},
						directives: [this.$store.state.settings.disableAnimatedMfm ? {} : {
							name: 'animate-css',
							value: { classes: 'tada', iteration: 'infinite' }
						}]
					}, genEl(node.children, inQuote));
				}

				case 'bigger': {
					bigCount++;
					const isMany = bigCount > 50;
					return (createElement as any)('strong', {
						attrs: {
							style: `display: inline-block; font-size: ${ isMany ? '100%' : '300%' };`
						},
						directives: [this.$store.state.settings.disableAnimatedMfm || isMany ? {} : {
							name: 'animate-css',
							value: { classes: 'wobble', iteration: 'infinite' }
						}]
					}, genEl(node.children, inQuote));
				}

				case 'fn': {
					// TODO: CSSを文字列で組み立てていくと node.props.args.~~~ 経由でCSSインジェクションできるのでよしなにやる
					let style;
					switch (node.props.name) {
						case 'tada': {
							style = `font-size: 150%;` + (!this.$store.state.settings.disableAnimatedMfm ? 'animation: tada 1s linear infinite both;' : '');
							break;
						}
						case 'jelly': {
							const speed = validTime(node.props.args.speed) || '1s';
							style = (!this.$store.state.settings.disableAnimatedMfm ? `animation: mfm-rubberBand ${speed} linear infinite both;` : '');
							break;
						}
						case 'twitch': {
							const speed = validTime(node.props.args.speed) || '0.5s';
							style = !this.$store.state.settings.disableAnimatedMfm ? `animation: mfm-twitch ${speed} ease infinite;` : '';
							break;
						}
						case 'shake': {
							const speed = validTime(node.props.args.speed) || '0.5s';
							style = !this.$store.state.settings.disableAnimatedMfm ? `animation: mfm-shake ${speed} ease infinite;` : '';
							break;
						}
						case 'spin': {
							const direction =
								node.props.args.left ? 'reverse' :
								node.props.args.alternate ? 'alternate' :
								'normal';
							const anime =
								node.props.args.x ? 'mfm-spinX' :
								node.props.args.y ? 'mfm-spinY' :
								'mfm-spin';
							const speed = validTime(node.props.args.speed) || '1.5s';
							const delay = validTime(node.props.args.delay) || '0s';
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
								(node.props.args.h && node.props.args.v) ? 'scale(-1, -1)' :
								node.props.args.v ? 'scaleY(-1)' :
								'scaleX(-1)';
							style = `transform: ${transform};`;
							break;
						}
						case 'rgbshift': {
							style = !this.$store.state.settings.disableAnimatedMfm ? 'animation: mfm-rgbshift 2s linear infinite;' : '';
							break;
						}
						case 'x2': {
							style = `font-size: 200%;`;
							break;
						}
						case 'x3': {
							style = `font-size: 400%;`;
							break;
						}
						case 'x4': {
							style = `font-size: 600%;`;
							break;
						}
						case 'font': {
							const family =
								node.props.args.serif ? 'serif' :
								node.props.args.monospace ? 'monospace' :
								node.props.args.cursive ? 'cursive' :
								node.props.args.fantasy ? 'fantasy' :
								node.props.args.emoji ? 'emoji' :
								node.props.args.math ? 'math' :
								null;
							if (family) style = `font-family: ${family};`;
							break;
						}
						case 'blur': {
							return [createElement('span', {
								attrs: {
									class: '_mfm_blur_'
								}
							}, genEl(node.children, inQuote))];
						}
					}

					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(node.children, inQuote));
				}

				case 'small': {
					return [createElement('small', {
						attrs: {
							style: 'opacity: 0.7;'
						},
					}, genEl(node.children, inQuote))];
				}

				case 'center': {
					return [createElement('div', {
						attrs: {
							style: 'text-align:center;'
						}
					}, genEl(node.children, inQuote))];
				}

				case 'motion': {
					motionCount++;
					const isMany = motionCount > 50;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;'
						},
						directives: [this.$store.state.settings.disableAnimatedMfm || isMany ? {} : {
							name: 'animate-css',
							value: { classes: 'rubberBand', iteration: 'infinite' }
						}]
					}, genEl(node.children, inQuote));
				}

				case 'spin': {
					motionCount++;
					const isMany = motionCount > 50;
					const direction =
						node.props.attr == 'left' ? 'reverse' :
						node.props.attr == 'alternate' ? 'alternate' :
						'normal';
						const style = (this.$store.state.settings.disableAnimatedMfm || isMany)
						? ''
						: `animation: spin 1.5s linear infinite; animation-direction: ${direction};`;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(node.children, inQuote));
				}

				case 'xspin': {
					motionCount++;
					const isMany = motionCount > 50;
					const direction =
						node.props.attr == 'left' ? 'reverse' :
						node.props.attr == 'alternate' ? 'alternate' :
						'normal';
						const style = (this.$store.state.settings.disableAnimatedMfm || isMany)
						? ''
						: `animation: xspin 1.5s linear infinite; animation-direction: ${direction};`;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(node.children, inQuote));
				}

				case 'yspin': {
					motionCount++;
					const isMany = motionCount > 50;
					const direction =
						node.props.attr == 'left' ? 'reverse' :
						node.props.attr == 'alternate' ? 'alternate' :
						'normal';
						const style = (this.$store.state.settings.disableAnimatedMfm || isMany)
						? ''
						: `animation: yspin 1.5s linear infinite; animation-direction: ${direction};`;
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block;' + style
						},
					}, genEl(node.children, inQuote));
				}

				case 'jump': {
					motionCount++;
					const isMany = motionCount > 50;
					return (createElement as any)('span', {
						attrs: {
							style: (this.$store.state.settings.disableAnimatedMfm || isMany) ? 'display: inline-block;' : 'display: inline-block; animation: jump 0.75s linear infinite;'
						},
					}, genEl(node.children, inQuote));
				}

				case 'flip': {
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block; transform: scaleX(-1);'
						},
					}, genEl(node.children, inQuote));
				}

				case 'vflip': {
					return (createElement as any)('span', {
						attrs: {
							style: 'display: inline-block; transform: scaleY(-1);'
						},
					}, genEl(node.children, inQuote));
				}

				case 'rotate': {
					const deg = node.props.attr;

					return (createElement as any)('span', {
						attrs: {
							style: `display: inline-block; transform: rotate(${deg}deg);`
						},
					}, genEl(node.children, inQuote));
				}

				// 装飾はここに追加
				case 'blink': {
					return (createElement as any)('span', {
						attrs: {
							style: (this.$store.state.settings.disableAnimatedMfm) ? 'display: inline-block;' : 'display: inline-block; animation: blink 0.75s linear infinite;'
						},
					}, genEl(node.children));
				}

				case 'twitch': {
					return (createElement as any)('span', {
						style: !this.$store.state.settings.disableAnimatedMfm ? 'display: inline-block; animation: mfm-twitch 0.5s ease infinite;' : 'display: inline-block;'
					}, genEl(node.children));
				}

				case 'shake': {
					return (createElement as any)('span', {
						style: !this.$store.state.settings.disableAnimatedMfm ? 'display: inline-block; animation: mfm-shake 0.5s ease infinite;' : 'display: inline-block;'
					}, genEl(node.children));
				}

				case 'rgbshift': {
					return (createElement as any)('span', {
						style: !this.$store.state.settings.disableAnimatedMfm ? 'animation: mfm-rgbshift 2s linear infinite;' : ''
					}, genEl(node.children));
				}

				case 'x2': {
					return (createElement as any)('span', {
						style: `font-size: 200%;`
					}, genEl(node.children));
				}

				case 'x3': {
					return (createElement as any)('span', {
						style: `font-size: 400%;`
					}, genEl(node.children));
				}

				case 'x4': {
					return (createElement as any)('span', {
						style: `font-size: 600%;`
					}, genEl(node.children));
				}

				case 'url': {
					return [createElement(MkUrl, {
						key: Math.random(),
						props: {
							url: node.props.url,
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
					let text = node.children.filter(x => x.type === 'text').map(x => x.props.text)[0];
					const href = node.props.url;

					const t = (text as string | null)?.match(/https?:\/\/\S+/);
					const h = (href as string | null)?.match(/https?:\/\/\S+/);

					if (t && h) {
						try {
							const tu = new URL(t[0]);
							const hu = new URL(h[0]);

							if (tu.hostname !== hu.hostname) {
								text = href;
							}
						} catch {}
					}

					return [createElement('a', {
						attrs: {
							class: 'link',
							href: href,
							rel: 'nofollow noopener',
							target: '_blank',
							title: href,
							style: 'color:var(--mfmLink);'
						}
					}, genEl(node.children, inQuote))];
				}

				case 'mention': {
					return [createElement(MkMention, {
						key: Math.random(),
						props: {
							customEmojis: this.customEmojis,
							host: (node.props.host == null && this.author && this.author.host != null ? this.author.host : node.props.host) || host,
							username: node.props.username
						}
					})];
				}

				case 'hashtag': {
					if (this.hashtags && !(this.hashtags as string[]).map(x => normalizeTag(x)).includes(normalizeTag(node.props.hashtag))) {
						return [createElement('span', `#${node.props.hashtag}`)];
					}

					return [createElement('router-link', {
						key: Math.random(),
						attrs: {
							to: this.isNote ? `/tags/${encodeURIComponent(node.props.hashtag)}` : `/explore/tags/${encodeURIComponent(node.props.hashtag)}`,
							style: 'color:var(--mfmHashtag);'
						}
					}, `#${node.props.hashtag}`)];
				}

				case 'blockCode': {
					return [createElement(MkCode, {
						key: Math.random(),
						props: {
							code: node.props.code,
							lang: node.props.lang,
						}
					})];
				}

				case 'inlineCode': {
					return [createElement(MkCode, {
						key: Math.random(),
						props: {
							code: node.props.code,
							lang: node.props.lang,
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
						}, genEl(node.children, 'quote'))];
					} else {
						return [createElement('span', {
							attrs: {
								class: 'quote'
							}
						}, genEl(node.children, 'quote'))];
					}
				}

				case 'title': {
					return [createElement('div', {
						attrs: {
							class: 'title'
						}
					}, genEl(node.children, inQuote))];
				}

				case 'emoji': {
					const customEmojis = (this.$root.getMetaSync() || { emojis: [] }).emojis || [];
					return [createElement('mk-emoji', {
						key: Math.random(),
						attrs: {
							emoji: node.props.emoji,
							name: node.props.name,
							vendor: node.props.vendor,
							local: node.props.local,
						},
						props: {
							customEmojis: this.customEmojis || customEmojis,
							normal: this.plain,
							direction: this.direction,
						}
					})];
				}

				case 'mathInline': {
					//const MkFormula = () => import('./formula.vue').then(m => m.default);
					return [createElement(MkFormula, {
						key: Math.random(),
						props: {
							formula: node.props.formula,
							block: false
						}
					})];
				}

				case 'mathBlock': {
					//const MkFormula = () => import('./formula.vue').then(m => m.default);
					return [createElement(MkFormula, {
						key: Math.random(),
						props: {
							formula: node.props.formula,
							block: true
						}
					})];
				}

				case 'search': {
					//const MkGoogle = () => import('./google.vue').then(m => m.default);
					return [createElement(MkGoogle, {
						key: Math.random(),
						props: {
							q: node.props.query
						}
					})];
				}

				case 'marquee': {
					if (this.$store.state.settings.disableAnimatedMfm) {
						return genEl(node.children, inQuote);
					}

					let className = 'marquee';

					if (node.props.attr === 'reverse') {
						className = 'marqueeReverse';
					} else if (node.props.attr === 'alternate') {
						className = 'marqueeAlternate';
					} else if (node.props.attr === 'slide') {
						className = 'marqueeSlide';
					} else if (node.props.attr === 'reverse-slide') {
						className = 'marqueeReverseSlide';
					}

					return [createElement('div', {
						attrs: {
							class: className
						}
					}, genEl(node.children, inQuote))];
				}

				case 'color': {
					let style = `color: ${node.props.fg};`;
					if (node.props.bg) {
						style += `background-color: ${node.props.bg};`
					}

					return [createElement('div', {
						attrs: {
							style
						}
					}, genEl(node.children, inQuote))];
				}

				default: {
					console.log('unknown ast type:', node.type);

					return [];
				}
			}
		}));

		// Parse ast to DOM
		return createElement('span', genEl(ast));
	}
});
