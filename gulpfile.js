// Include gulp
var gulp = require('gulp');
// Include plugins
var uglify = require('gulp-uglify');
var minifyCSS = require('gulp-clean-css');
var minifyHTML = require('gulp-minify-html');
var copy = require('gulp-copy');

var isRelease = false;
var destination = "debug";
if (isRelease)
{
    destination = "release";
}

// Minify JS
gulp.task('uglify', function()
{
    return gulp.src('src/*.js')
        .pipe(uglify())
        .pipe(gulp.dest(destination));
});
// Minify CSS
gulp.task('minify-css', function()
{
    return gulp.src('src/*.css')
        .pipe(minifyCSS())
        .pipe(gulp.dest(destination))
});
// Minify HTML
gulp.task('minify-html', function()
{
    return gulp.src('src/*.html')
        .pipe(minifyHTML())
        .pipe(gulp.dest(destination))
});
// Copy src without min
gulp.task('copy-debug', function()
{
    return gulp.src('./src/**/*.{html,js,css,json}',
        {
            read: false
        })
        .pipe(copy(destination))
});
// Copy README
gulp.task('copy', function()
{
    return gulp.src(['README.md', 'manifest.json'],
        {
            read: false
        })
        .pipe(copy(destination))
});


// Default Task
if (isRelease)
{
    gulp.task('default', ['uglify', 'minify-css', 'minify-html', 'copy']);
}
else
{
    gulp.task('default', ['copy-debug', 'copy']);
}