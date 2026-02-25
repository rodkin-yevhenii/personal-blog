"use strict";

const { src, dest, watch, series, parallel } = require("gulp");
const browserSync = require("browser-sync").create();
const sass = require("gulp-sass")(require("sass"));
const postcss = require("gulp-postcss");
const autoprefixer = require("autoprefixer");
const plumber = require("gulp-plumber");
const rename = require("gulp-rename");
const notify = require("gulp-notify");
const webpackStream = require("webpack-stream");
const webpack = require("webpack");
const panini = require("panini");
const cssnano = require("cssnano");
const { deleteAsync } = require("del");

const isProd = process.env.NODE_ENV === "production";

const srcPath = "src/";
const distPath = "dist/";

const path = {
    build: {
        html: distPath,
        js: distPath + "assets/js/",
        css: distPath + "assets/css/",
        images: distPath + "assets/images/",
        fonts: distPath + "assets/fonts/",
    },
    src: {
        html: srcPath + "*.html",
        js: srcPath + "assets/js/**/*.js",
        css: srcPath + "assets/scss/**/*.scss",
        images: srcPath + "assets/images/**/*.{jpg,png,svg,gif,ico,webp,webmanifest,xml,json}",
        fonts: srcPath + "assets/fonts/**/*.{eot,woff,woff2,ttf,svg}",
    },
};

function clean() {
    return deleteAsync(distPath);
}

function serve() {
    browserSync.init({
        server: { baseDir: distPath },
    });
}

function html() {
    panini.refresh();
    return src(path.src.html, { base: srcPath })
        .pipe(plumber())
        .pipe(
            panini({
                root: srcPath,
                layouts: srcPath + "layouts/",
                partials: srcPath + "partials/",
                helpers: srcPath + "helpers/",
                data: srcPath + "data/",
            })
        )
        .pipe(dest(path.build.html))
        .pipe(browserSync.stream());
}

function styles() {
    return src(path.src.css, { base: srcPath + "assets/scss/" })
        .pipe(
            plumber({
                errorHandler(err) {
                    notify.onError({
                        title: "SCSS Error",
                        message: err.message,
                    })(err);
                    this.emit("end");
                },
            })
        )
        .pipe(sass({ includePaths: "./node_modules/" }))
        .pipe(postcss([
            autoprefixer(),
            ...(isProd ? [cssnano()] : [])
        ]))
        .pipe(rename({ suffix: isProd ? ".min" : "" }))
        .pipe(dest(path.build.css))
        .pipe(browserSync.stream());
}

function scripts() {
    return src(path.src.js, { base: srcPath + "assets/js/" })
        .pipe(
            plumber({
                errorHandler(err) {
                    notify.onError({
                        title: "JS Error",
                        message: err.message,
                    })(err);
                    this.emit("end");
                },
            })
        )
        .pipe(
            webpackStream(
                {
                    mode: isProd ? "production" : "development",
                    output: { filename: "app.js" },
                    module: {
                        rules: [
                            {
                                test: /\.js$/,
                                exclude: /node_modules/,
                                use: {
                                    loader: "babel-loader",
                                    options: {
                                        presets: ["@babel/preset-env"],
                                    },
                                },
                            },
                        ],
                    },
                },
                webpack
            )
        )
        .pipe(dest(path.build.js))
        .pipe(browserSync.stream());
}

function images() {
    return src(path.src.images)
        .pipe(dest(path.build.images))
        .pipe(browserSync.stream());
}

function fonts() {
    return src(path.src.fonts)
        .pipe(dest(path.build.fonts))
        .pipe(browserSync.stream());
}

function watcher() {
    watch(srcPath + "**/*.html", html);
    watch(path.src.css, styles);
    watch(path.src.js, scripts);
    watch(path.src.images, images);
    watch(path.src.fonts, fonts);
}

exports.clean = clean;
exports.build = series(clean, parallel(html, styles, scripts, images, fonts));
exports.default = series(exports.build, parallel(watcher, serve));