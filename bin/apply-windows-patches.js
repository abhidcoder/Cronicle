#!/usr/bin/env node
// Apply Windows compatibility patches to node_modules (run after npm install).
// Usage: node bin/apply-windows-patches.js

var path = require('path');
var fs = require('fs');

var root = path.join(__dirname, '..');
var listPath = path.join(root, 'node_modules', 'pixl-server-storage', 'list.js');
var fsPath = path.join(root, 'node_modules', 'pixl-server-storage', 'engines', 'Filesystem.js');

function patchList() {
	var file = listPath;
	if (!fs.existsSync(file)) {
		console.warn('Skip list.js (not found): ' + file);
		return false;
	}
	var code = fs.readFileSync(file, 'utf8');
	if (code.indexOf('Invalid list page structure') !== -1) {
		console.log('list.js: already patched');
		return true;
	}
	var re = /(if \(err\) return callback\(err, null\);)\s*(\/\/ now scan page's items)\s*(for \(var idx = 0, len = page\.items\.length;)/;
	var newCode = code.replace(re, '$1\n\t\t\t\t\t\t\tif (!page || !Array.isArray(page.items)) {\n\t\t\t\t\t\t\t\treturn callback(new Error(\'Invalid list page structure: missing or invalid items array (key: \' + key + \', page: \' + page_idx + \')\'), null);\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t$2\n\t\t\t\t\t\t\t$3');
	if (newCode === code) {
		console.warn('list.js: pattern not found, skip');
		return false;
	}
	code = newCode;
	fs.writeFileSync(file, code);
	console.log('list.js: patched (listFind page.items check)');
	return true;
}

function patchFilesystem() {
	var file = fsPath;
	if (!fs.existsSync(file)) {
		console.warn('Skip Filesystem.js (not found): ' + file);
		return false;
	}
	var code = fs.readFileSync(file, 'utf8');
	// EPERM rename fix: after first fs.rename, on EPERM/EEXIST try unlink(dest) then rename again
	var needle = "fs.rename(source_file, dest_file, function(rn_err) {\n\t\t\tif (!rn_err || (rn_err.code == 'EXDEV')) return callback();\n\t\t\t\n\t\t\tself.logDebug(6, \"Error renaming file:\"";
	var replacement = "fs.rename(source_file, dest_file, function(rn_err) {\n\t\t\tif (!rn_err) return callback();\n\t\t\tif (rn_err.code === 'EXDEV') return callback(rn_err);\n\t\t\t\n\t\t\tif ((rn_err.code === 'EPERM' || rn_err.code === 'EEXIST') && rn_err.syscall === 'rename') {\n\t\t\t\tself.logDebug(6, 'Rename failed (dest exists?), removing dest and retrying: ' + dest_file);\n\t\t\t\tfs.unlink(dest_file, function(del_err) {\n\t\t\t\t\tif (del_err && del_err.code !== 'ENOENT') return callback(rn_err);\n\t\t\t\t\tfs.rename(source_file, dest_file, callback);\n\t\t\t\t});\n\t\t\t\treturn;\n\t\t\t}\n\t\t\t\n\t\t\tself.logDebug(6, \"Error renaming file:\"";
	if (code.indexOf('Rename failed (dest exists?)') !== -1) {
		console.log('Filesystem.js: already patched');
		return true;
	}
	if (code.indexOf("if (!rn_err || (rn_err.code == 'EXDEV')) return callback();") === -1) {
		console.warn('Filesystem.js: pattern not found, skip');
		return false;
	}
	code = code.replace(
		/fs\.rename\(source_file, dest_file, function\(rn_err\) \{\s*if \(!rn_err \|\| \(rn_err\.code == 'EXDEV'\)\) return callback\(\);[^}]+\}\);[^}]+\}\);[^}]+\}\);/,
		"fs.rename(source_file, dest_file, function(rn_err) {\n\t\t\tif (!rn_err) return callback();\n\t\t\tif (rn_err.code === 'EXDEV') return callback(rn_err);\n\t\t\t\n\t\t\tif ((rn_err.code === 'EPERM' || rn_err.code === 'EEXIST') && rn_err.syscall === 'rename') {\n\t\t\t\tself.logDebug(6, 'Rename failed (dest exists?), removing dest and retrying: ' + dest_file);\n\t\t\t\tfs.unlink(dest_file, function(del_err) {\n\t\t\t\t\tif (del_err && del_err.code !== 'ENOENT') return callback(rn_err);\n\t\t\t\t\tfs.rename(source_file, dest_file, callback);\n\t\t\t\t});\n\t\t\t\treturn;\n\t\t\t}\n\t\t\t\n\t\t\tself.logDebug(6, \"Error renaming file: \" + source_file + \" --> \" + dest_file + \": \" + rn_err + \" (will retry)\");\n\t\t\tself._makeDirs( path.dirname(dest_file), 0o0775, function(mk_err) {\n\t\t\t\tif (mk_err) return callback(rn_err);\n\t\t\t\tfs.rename(source_file, dest_file, callback);\n\t\t\t});\n\t\t});"
	);
	if (code.indexOf('Rename failed (dest exists?)') === -1) {
		// Simpler replace: just the first block
		var oldBlock = "fs.rename(source_file, dest_file, function(rn_err) {\n			if (!rn_err || (rn_err.code == 'EXDEV')) return callback();\n			\n			self.logDebug(6, \"Error renaming file: \" + source_file + \" --> \" + dest_file + \": \" + rn_err + \" (will retry)\");\n			\n			// we may need one more mkdir (race condition with delete)\n			self._makeDirs( path.dirname(dest_file), 0o0775, function(mk_err) {\n				if (mk_err) return callback(rn_err);\n				\n				// last try\n				fs.rename(source_file, dest_file, callback);\n			});\n		});";
		var newBlock = "fs.rename(source_file, dest_file, function(rn_err) {\n			if (!rn_err) return callback();\n			if (rn_err.code === 'EXDEV') return callback(rn_err);\n			if ((rn_err.code === 'EPERM' || rn_err.code === 'EEXIST') && rn_err.syscall === 'rename') {\n				self.logDebug(6, 'Rename failed (dest exists?), removing dest and retrying: ' + dest_file);\n				fs.unlink(dest_file, function(del_err) {\n					if (del_err && del_err.code !== 'ENOENT') return callback(rn_err);\n					fs.rename(source_file, dest_file, callback);\n				});\n				return;\n			}\n			self.logDebug(6, \"Error renaming file: \" + source_file + \" --> \" + dest_file + \": \" + rn_err + \" (will retry)\");\n			self._makeDirs( path.dirname(dest_file), 0o0775, function(mk_err) {\n				if (mk_err) return callback(rn_err);\n				fs.rename(source_file, dest_file, callback);\n			});\n		});";
		if (code.indexOf(oldBlock) !== -1) {
			code = code.replace(oldBlock, newBlock);
		} else {
			console.warn('Filesystem.js: block not found');
			return false;
		}
	}
	fs.writeFileSync(file, code);
	console.log('Filesystem.js: patched (EPERM rename on Windows)');
	return true;
}

var nm = path.join(root, 'node_modules');
if (!fs.existsSync(nm)) {
	console.log('node_modules not found. Run: npm install --ignore-scripts');
	process.exit(1);
}
console.log('Applying Windows patches to node_modules...\n');
patchList();
patchFilesystem();
console.log('\nDone. Restart Cronicle if it is running.');
