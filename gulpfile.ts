/**
 * Gulp tasks
 */

import * as gulp from 'gulp';
import * as ts from 'gulp-typescript';
const sourcemaps = require('gulp-sourcemaps');
const stylus = require('gulp-stylus');
import * as rimraf from 'rimraf';
import * as rename from 'gulp-rename';
const replace = require('gulp-replace');
const terser = require('gulp-terser');
const cleanCSS = require('gulp-clean-css');

const locales = require('./locales');

const env = process.env.NODE_ENV || 'development';

gulp.task('build:ts', () => {
	const tsProject = ts.createProject('./tsconfig.json');

	return tsProject
		.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject())
		.on('error', () => {})
		.pipe(sourcemaps.write('.', { includeContent: false, sourceRoot: '../built' }))
		.pipe(gulp.dest('./built/'));
});

gulp.task('build:copy:views', () =>
	gulp.src('./src/server/web/views/**/*').pipe(gulp.dest('./built/server/web/views'))
);

gulp.task('build:copy:fonts', () =>
	gulp.src('./node_modules/three/examples/fonts/**/*').pipe(gulp.dest('./built/client/assets/fonts/'))
);

gulp.task('build:copy:docs', () =>
	gulp.src('./src/docs/*.md').pipe(gulp.dest('./built/docs/'))
);

gulp.task('build:copy', gulp.parallel('build:copy:views', 'build:copy:fonts', 'build:copy:docs', () =>
	gulp.src([
		'./src/const.json',
		'./src/server/web/views/**/*',
		'./src/**/assets/**/*',
		'!./src/client/app/**/assets/**/*'
	]).pipe(gulp.dest('./built/'))
));

gulp.task('clean', gulp.parallel(
	cb => rimraf('./built', cb),
	cb => rimraf('./node_modules/.cache', cb)
));

gulp.task('cleanall', gulp.parallel('clean', cb =>
	rimraf('./node_modules', cb)
));

gulp.task('build:client:script', () => {
	// eslint-disable-next-line node/no-unpublished-require
	const client = require('./built/meta.json');
	return gulp.src(['./src/client/app/boot.js', './src/client/app/safe.js'])
		.pipe(replace('VERSION', JSON.stringify(client.version)))
		.pipe(replace('ENV', JSON.stringify(env)))
		.pipe(replace('LANGS', JSON.stringify(Object.keys(locales))))
		.pipe(terser({
			toplevel: true
		}))
		.pipe(gulp.dest('./built/client/assets/'));
});

gulp.task('build:client:styles', () =>
	gulp.src('./src/client/app/init.css')
		.pipe(cleanCSS())
		.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('copy:client', () =>
		gulp.src([
			'./assets/**/*',
			'./src/client/assets/**/*',
			'./src/client/app/*/assets/**/*'
		])
			.pipe(rename(path => {
				path.dirname = path.dirname!.replace('assets', '.');
			}))
			.pipe(gulp.dest('./built/client/assets/'))
);

gulp.task('doc', () =>
	gulp.src('./src/docs/**/*.styl')
		.pipe(stylus())
		.pipe(cleanCSS())
		.pipe(gulp.dest('./built/docs/assets/'))
);

gulp.task('build:client', gulp.parallel(
	'build:client:script',
	'build:client:styles',
	'copy:client'
));

gulp.task('build', gulp.parallel(
	'build:ts',
	'build:copy',
	'build:client',
	'doc'
));

gulp.task('default', gulp.task('build')!);