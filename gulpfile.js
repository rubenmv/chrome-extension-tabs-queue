// Include gulp
var gulp = require('gulp');
// Include plugins
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-minify-css');
var minifyHTML = require('gulp-minify-html');
var copy = require('gulp-copy');
// Minify JS
gulp.task('uglify', function () {
    return gulp.src('src/*.js')
        .pipe(uglify())
        .pipe(gulp.dest('release'));
});
// Minify CSS
gulp.task('minify-css', function () {
    return gulp.src('src/*.css')
        .pipe(minifyCSS())
        .pipe(gulp.dest('release'))
});
// Minify HTML
gulp.task('minify-html', function () {
    return gulp.src('src/*.html')
        .pipe(minifyHTML())
        .pipe(gulp.dest('release'))
});
// Copy README
gulp.task('copy', function () {
    return gulp.src('README.md')
        .pipe(copy('release'))
});
// Default Task
gulp.task('default', ['uglify', 'minify-css', 'minify-html', 'copy']);
