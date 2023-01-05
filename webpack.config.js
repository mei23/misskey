/**
 * webpack configuration
 */

const fs = require('fs');
const webpack = require('webpack');
const rndstr_1 = require('rndstr');
const chalk = require('chalk');
const { VueLoaderPlugin } = require('vue-loader');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
class WebpackOnBuildPlugin {
	constructor(callback) {
		this.callback = callback;
	}
	apply(compiler) {
		compiler.hooks.done.tap('WebpackOnBuildPlugin', this.callback);
	}
}

const isProduction = process.env.NODE_ENV == 'production';

const constants = require('./src/const.json');

const mods = fs.existsSync('./mods.json') ? require('./mods.json') : {};

const locales = require('./locales');
const meta = require('./package.json');
const codename = meta.codename;

const version = isProduction ? meta.version : meta.version + '-' + (0, rndstr_1.default)({ length: 8, chars: '0-9a-z' });

const postcss = {
	loader: 'postcss-loader',
	options: {
		postcssOptions: {
			plugins: [
				require('cssnano')({
					preset: 'default'
				})
			]
		},
	},
};

module.exports = {
	entry: {
		desktop: './src/client/app/desktop/script.ts',
		mobile: './src/client/app/mobile/script.ts',
		dev: './src/client/app/dev/script.ts',
		auth: './src/client/app/auth/script.ts',
		admin: './src/client/app/admin/script.ts',
		sw: './src/client/app/sw.js'
	},
	module: {
		rules: [{
			test: /\.vue$/,
			exclude: /node_modules/,
			use: [{
				loader: 'vue-loader',
				options: {
					cssSourceMap: false,
					compilerOptions: {
						preserveWhitespace: false
					}
				}
			}, {
				loader: 'vue-svg-inline-loader'
			}]
		}, {
			test: /\.styl(us)?$/,
			exclude: /node_modules/,
			oneOf: [{
				resourceQuery: /module/,
				use: [{
					loader: 'vue-style-loader'
				}, {
					loader: 'css-loader',
					options: {
						modules: true,
						esModule: false,
						url: false,
					}
				}, postcss, {
					loader: 'stylus-loader'
				}]
			}, {
				use: [{
					loader: 'vue-style-loader'
				}, {
					loader: 'css-loader',
					options: {
						url: false,
						esModule: false
					}
				}, postcss, {
					loader: 'stylus-loader'
				}]
			}]
		}, {
			test: /\.css$/,
			use: [{
				loader: 'vue-style-loader'
			}, {
				loader: 'css-loader',
				options: {
					esModule: false,
				}
			}, postcss]
		}, {
			test: /\.(eot|woff|woff2|svg|ttf)([?]?.*)$/,
			type: 'asset/resource'
		}, {
			test: /\.json5$/,
			loader: 'json5-loader',
			options: {
				esModule: false,
			},
			type: 'javascript/auto'
		}, {
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader',
				options: {
					happyPackMode: true,
					configFile: __dirname + '/src/client/app/tsconfig.json',
					appendTsSuffixTo: [/\.vue$/]
				}
			}]
		}]
	},
	plugins: [
		new ProgressBarPlugin({
			format: chalk `  {cyan.bold webpack} {bold [}:bar{bold ]} {green.bold :percent} :msg :elapseds`,
			clear: false
		}),
		new webpack.DefinePlugin({
			_CONSTANTS_: JSON.stringify(constants),
			_VERSION_: JSON.stringify(version),
			_CODENAME_: JSON.stringify(codename),
			_LANGS_: JSON.stringify(Object.entries(locales).map(([k, v]) => [k, v && v.meta && v.meta.lang])),
			_ENV_: JSON.stringify(process.env.NODE_ENV),
			_MODS_: JSON.stringify(mods)
		}),
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
		}),
		new WebpackOnBuildPlugin(stats => {
			fs.writeFileSync('./built/meta.json', JSON.stringify({ version }), 'utf-8');
			fs.mkdirSync('./built/client/assets/locales', { recursive: true });

			for (const [lang, locale] of Object.entries(locales))
				fs.writeFileSync(`./built/client/assets/locales/${lang}.json`, JSON.stringify(locale), 'utf-8');
		}),
		new VueLoaderPlugin()
	],
	output: {
		path: __dirname + '/built/client/assets',
		filename: `[name].${version}.js`,
		publicPath: `/assets/`
	},
	resolve: {
		extensions: [
			'.js', '.ts', '.json'
		],
		alias: {
			'const.styl': __dirname + '/src/client/const.styl'
		},
		fallback: {
			'crypto': false
		}
	},
	resolveLoader: {
		modules: ['node_modules']
	},
	optimization: {
		minimizer: [new TerserPlugin({
			parallel: 1,
			exclude: [
				/admin/,
				/dev/
			]
		})]
	},
	devtool: false, //'source-map',
	mode: isProduction ? 'production' : 'development'
};
