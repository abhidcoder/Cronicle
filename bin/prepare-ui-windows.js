#!/usr/bin/env node
// Copy UI assets into htdocs for Windows (symlinks often fail). Run after npm install.
// Usage: node bin/prepare-ui-windows.js

var path = require('path');
var fs = require('fs');

var root = path.join(__dirname, '..');
var htdocs = path.join(root, 'htdocs');
var nm = path.join(root, 'node_modules');

function mkdir(p) {
	if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function copy(src, dest) {
	if (!fs.existsSync(src)) return false;
	mkdir(path.dirname(dest));
	fs.copyFileSync(src, dest);
	return true;
}

function copyDir(srcDir, destDir, ext) {
	if (!fs.existsSync(srcDir)) return;
	mkdir(destDir);
	var list = fs.readdirSync(srcDir);
	list.forEach(function (name) {
		var src = path.join(srcDir, name);
		var dest = path.join(destDir, name);
		var stat = fs.statSync(src);
		if (stat.isDirectory()) copyDir(src, dest, ext);
		else if (!ext || path.extname(name) === ext) {
			try { fs.copyFileSync(src, dest); } catch (e) { /* ignore */ }
		}
	});
}

console.log('Preparing Cronicle UI for Windows...\n');

// index.html
var indexDev = path.join(htdocs, 'index-dev.html');
var indexHtml = path.join(htdocs, 'index.html');
if (fs.existsSync(indexDev)) {
	fs.copyFileSync(indexDev, indexHtml);
	console.log('Created htdocs/index.html');
} else {
	console.warn('htdocs/index-dev.html not found');
}

// js/external
var extDir = path.join(htdocs, 'js', 'external');
mkdir(extDir);
var external = [
	['jquery/dist/jquery.min.js', 'js/external/jquery.min.js'],
	['moment/min/moment.min.js', 'js/external/moment.min.js'],
	['moment-timezone/builds/moment-timezone-with-data.min.js', 'js/external/moment-timezone-with-data.min.js'],
	['chart.js/dist/Chart.min.js', 'js/external/Chart.min.js'],
	['jstimezonedetect/dist/jstz.min.js', 'js/external/jstz.min.js']
];
var missingExt = [];
external.forEach(function (pair) {
	var src = path.join(nm, pair[0]);
	var dest = path.join(htdocs, pair[1]);
	if (copy(src, dest)) console.log('  ' + pair[1]);
	else missingExt.push(pair[1]);
});
if (missingExt.length) console.warn('  MISSING (run npm install first): ' + missingExt.join(', '));

// js/common (pixl-webapp)
var commonSrc = path.join(nm, 'pixl-webapp', 'js');
var commonDest = path.join(htdocs, 'js', 'common');
if (fs.existsSync(commonSrc)) {
	copyDir(commonSrc, commonDest);
	console.log('  js/common/* (from pixl-webapp)');
} else {
	console.warn('  node_modules/pixl-webapp/js not found');
}

// css + fonts
var cssDir = path.join(htdocs, 'css');
var fontsDir = path.join(htdocs, 'fonts');
mkdir(cssDir);
mkdir(fontsDir);
var faCss = path.join(nm, 'font-awesome', 'css', 'font-awesome.min.css');
var faFonts = path.join(nm, 'font-awesome', 'fonts');
if (fs.existsSync(faCss)) {
	fs.copyFileSync(faCss, path.join(cssDir, 'font-awesome.min.css'));
	console.log('  css/font-awesome.min.css');
}
if (fs.existsSync(faFonts)) {
	copyDir(faFonts, fontsDir);
	console.log('  fonts/* (font-awesome)');
}
var mdiCss = path.join(nm, 'mdi', 'css', 'materialdesignicons.min.css');
var mdiFonts = path.join(nm, 'mdi', 'fonts');
if (fs.existsSync(mdiCss)) {
	fs.copyFileSync(mdiCss, path.join(cssDir, 'materialdesignicons.min.css'));
	console.log('  css/materialdesignicons.min.css');
}
if (fs.existsSync(mdiFonts)) {
	copyDir(mdiFonts, fontsDir);
	console.log('  fonts/* (mdi)');
}
var baseCss = path.join(nm, 'pixl-webapp', 'css', 'base.css');
if (fs.existsSync(baseCss)) {
	fs.copyFileSync(baseCss, path.join(cssDir, 'base.css'));
	console.log('  css/base.css');
}

console.log('\nDone. Restart Cronicle and reload http://localhost:3012/');
