#!/usr/bin/env node
// Apply Windows compatibility patches to node_modules (run after npm install).
// Usage: node bin/apply-windows-patches.js

var path = require('path');
var fs = require('fs');

var root = path.join(__dirname, '..');
var listPath = path.join(root, 'node_modules', 'pixl-server-storage', 'list.js');
var fsPath = path.join(root, 'node_modules', 'pixl-server-storage', 'engines', 'Filesystem.js');
var transactionPath = path.join(root, 'node_modules', 'pixl-server-storage', 'transaction.js');

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
	var replacement = "fs.rename(source_file, dest_file, function(rn_err) {\n\t\t\tif (!rn_err) return callback();\n\t\t\tif (rn_err.code === 'EXDEV') return callback(rn_err);\n\t\t\t\n\t\t\tif ((rn_err.code === 'EPERM' || rn_err.code === 'EEXIST') && rn_err.syscall === 'rename') {\n\t\t\t\tself.logDebug(6, 'Rename failed (dest exists?), removing dest and retrying: ' + dest_file);\n\t\t\t\tfs.unlink(dest_file, function(del_err) {\n\t\t\t\t\tif (del_err && del_err.code !== 'ENOENT') return tryCopyFallback();\n\t\t\t\t\tfs.rename(source_file, dest_file, function(rn2_err) {\n\t\t\t\t\t\tif (rn2_err && (rn2_err.code === 'EPERM' || rn2_err.code === 'EEXIST')) return tryCopyFallback();\n\t\t\t\t\t\tcallback(rn2_err);\n\t\t\t\t\t});\n\t\t\t\t});\n\t\t\t\treturn;\n\t\t\t}\n\t\t\t\n\t\t\tself.logDebug(6, \"Error renaming file:\"";
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
		"fs.rename(source_file, dest_file, function(rn_err) {\n\t\t\tif (!rn_err) return callback();\n\t\t\tif (rn_err.code === 'EXDEV') return callback(rn_err);\n\t\t\t\n\t\t\tif ((rn_err.code === 'EPERM' || rn_err.code === 'EEXIST') && rn_err.syscall === 'rename') {\n\t\t\t\tself.logDebug(6, 'Rename failed (dest exists?), removing dest and retrying: ' + dest_file);\n\t\t\t\tfs.unlink(dest_file, function(del_err) {\n\t\t\t\t\tif (del_err && del_err.code !== 'ENOENT') return tryCopyFallback();\n\t\t\t\t\tfs.rename(source_file, dest_file, function(rn2_err) {\n\t\t\t\t\t\tif (rn2_err && (rn2_err.code === 'EPERM' || rn2_err.code === 'EEXIST')) return tryCopyFallback();\n\t\t\t\t\t\tcallback(rn2_err);\n\t\t\t\t\t});\n\t\t\t\t});\n\t\t\t\treturn;\n\t\t\t}\n\t\t\t\n\t\t\tself.logDebug(6, \"Error renaming file: \" + source_file + \" --> \" + dest_file + \": \" + rn_err + \" (will retry)\");\n\t\t\tself._makeDirs( path.dirname(dest_file), 0o0775, function(mk_err) {\n\t\t\t\tif (mk_err) return callback(rn_err);\n\t\t\t\tfs.rename(source_file, dest_file, callback);\n\t\t\t});\n\t\t});"
	);
	if (code.indexOf('Rename failed (dest exists?)') === -1) {
		// Simpler replace: just the first block
		var oldBlock = "fs.rename(source_file, dest_file, function(rn_err) {\n			if (!rn_err || (rn_err.code == 'EXDEV')) return callback();\n			\n			self.logDebug(6, \"Error renaming file: \" + source_file + \" --> \" + dest_file + \": \" + rn_err + \" (will retry)\");\n			\n			// we may need one more mkdir (race condition with delete)\n			self._makeDirs( path.dirname(dest_file), 0o0775, function(mk_err) {\n				if (mk_err) return callback(rn_err);\n				\n				// last try\n				fs.rename(source_file, dest_file, callback);\n			});\n		});";
		var newBlock = "fs.rename(source_file, dest_file, function(rn_err) {\n			if (!rn_err) return callback();\n			if (rn_err.code === 'EXDEV') return callback(rn_err);\n			if ((rn_err.code === 'EPERM' || rn_err.code === 'EEXIST') && rn_err.syscall === 'rename') {\n				self.logDebug(6, 'Rename failed (dest exists?), removing dest and retrying: ' + dest_file);\n				fs.unlink(dest_file, function(del_err) {\n					if (del_err && del_err.code !== 'ENOENT') return tryCopyFallback();\n					fs.rename(source_file, dest_file, function(rn2_err) {\n						if (rn2_err && (rn2_err.code === 'EPERM' || rn2_err.code === 'EEXIST')) return tryCopyFallback();\n						callback(rn2_err);\n					});\n				});\n				return;\n			}\n			self.logDebug(6, \"Error renaming file: \" + source_file + \" --> \" + dest_file + \": \" + rn_err + \" (will retry)\");\n			self._makeDirs( path.dirname(dest_file), 0o0775, function(mk_err) {\n				if (mk_err) return callback(rn_err);\n				fs.rename(source_file, dest_file, callback);\n			});\n		});";
		if (code.indexOf(oldBlock) !== -1) {
			code = code.replace(oldBlock, newBlock);
		} else {
			console.warn('Filesystem.js: block not found');
			return false;
		}
	}
	// Add copy+unlink fallback (and readFile+writeFile when copyFile hits EPERM) if missing
	if (code.indexOf('tryCopyFallback') === -1) {
		var inject = "function tryCopyFallback() {\n\t\t\t\tself.logDebug(6, 'Rename failed on Windows, using copy+unlink fallback');\n\t\t\t\tfs.unlink(dest_file, function(del_err) {\n\t\t\t\t\tif (del_err && del_err.code !== 'ENOENT') self.logDebug(6, 'Could not unlink dest before copy: ' + del_err.message);\n\t\t\t\t\tfs.copyFile(source_file, dest_file, function(cp_err) {\n\t\t\t\t\t\tif (!cp_err) return fs.unlink(source_file, function() { callback(); });\n\t\t\t\t\t\tif (cp_err.code === 'EPERM' || cp_err.code === 'EACCES') {\n\t\t\t\t\t\t\tself.logDebug(6, 'copyFile failed, trying write-to-new-path then rename fallback');\n\t\t\t\t\t\t\tfs.readFile(source_file, function(rf_err, buf) {\n\t\t\t\t\t\t\t\tif (rf_err) return callback(rf_err);\n\t\t\t\t\t\t\t\tvar dest_dir = path.dirname(dest_file);\n\t\t\t\t\t\t\t\tvar temp_dest = path.join(dest_dir, '.tmp-' + Date.now() + '-' + path.basename(dest_file));\n\t\t\t\t\t\t\t\tfs.writeFile(temp_dest, buf, function(wf_err) {\n\t\t\t\t\t\t\t\t\tif (wf_err) return callback(wf_err);\n\t\t\t\t\t\t\t\t\tfs.unlink(source_file, function() {});\n\t\t\t\t\t\t\t\t\tfs.unlink(dest_file, function(d2_err) {\n\t\t\t\t\t\t\t\t\t\tif (d2_err && d2_err.code !== 'ENOENT') self.logDebug(6, 'Could not unlink dest before final rename: ' + d2_err.message);\n\t\t\t\t\t\t\t\t\t\tfs.rename(temp_dest, dest_file, function(rn_err) {\n\t\t\t\t\t\t\t\t\t\t\tif (rn_err) { fs.unlink(temp_dest, function() {}); return callback(rn_err); }\n\t\t\t\t\t\t\t\t\t\t\tcallback();\n\t\t\t\t\t\t\t\t\t\t});\n\t\t\t\t\t\t\t\t\t});\n\t\t\t\t\t\t\t\t});\n\t\t\t\t\t\t\t});\n\t\t\t\t\t\t\treturn;\n\t\t\t\t\t\t}\n\t\t\t\t\t\tcallback(cp_err);\n\t\t\t\t\t});\n\t\t\t\t});\n\t\t\t}\n\t\t\t";
		code = code.replace(/_renameFile: function\(source_file, dest_file, callback\) \{\s*var self = this;\s*/, '_renameFile: function(source_file, dest_file, callback) {\n\t\tvar self = this;\n\t\t' + inject);
		if (code.indexOf('tryCopyFallback') === -1) {
			console.warn('Filesystem.js: could not inject tryCopyFallback');
		}
	}
	fs.writeFileSync(file, code);
	console.log('Filesystem.js: patched (EPERM rename + copy/read+write fallback on Windows)');
	return true;
}

function patchTransaction() {
	var file = transactionPath;
	if (!fs.existsSync(file)) {
		console.warn('Skip transaction.js (not found): ' + file);
		return false;
	}
	var code = fs.readFileSync(file, 'utf8');
	if (code.indexOf('parseRecoveryLine') !== -1) {
		console.log('transaction.js: already patched');
		return true;
	}
	// Original: one JSON.parse(line) per line. Replace with multi-object parsing for recovery log.
	var oldBlock = [
		'\t\t// read in file line by line',
		'\t\t// (file may not exist, which is fine, hence \'ignore_not_found\')',
		'\t\tTools.fileEachLine( trans.log, { ignore_not_found: true },',
		'\t\t\tfunction(line, callback) {',
		'\t\t\t\tvar json = null;',
		'\t\t\t\ttry { json = JSON.parse(line); }',
		'\t\t\t\tcatch (err) {',
		'\t\t\t\t\t// non-fatal, file may have been partially written',
		'\t\t\t\t\tself.logError(\'rollback\', "Failed to parse JSON in recovery log: " + err, line);',
		'\t\t\t\t\treturn callback();',
		'\t\t\t\t}',
		'\t\t\t\tif (json) {',
		'\t\t\t\t\tif (json.key) {',
		'\t\t\t\t\t\t// restore or delete record',
		'\t\t\t\t\t\tif (json.value) {',
		'\t\t\t\t\t\t\tself.put( json.key, json.value, function(err) {',
		'\t\t\t\t\t\t\t\tif (err) {',
		'\t\t\t\t\t\t\t\t\tvar msg = "Could not rollback transaction: " + path + ": Failed to restore record: " + json.key + ": " + err.message;',
		'\t\t\t\t\t\t\t\t\tself.logError(\'rollback\', msg);',
		'\t\t\t\t\t\t\t\t\treturn callback( new Error(msg) ); // this is fatal',
		'\t\t\t\t\t\t\t\t}',
		'\t\t\t\t\t\t\t\tcallback();',
		'\t\t\t\t\t\t\t} );',
		'\t\t\t\t\t\t}',
		'\t\t\t\t\t\telse {',
		'\t\t\t\t\t\t\tself.delete( json.key, function(err) {',
		'\t\t\t\t\t\t\t\tif (err && (err.code != "NoSuchKey")) {',
		'\t\t\t\t\t\t\t\t\tvar msg = "Could not rollback transaction: " + path + ": Failed to delete record: " + json.key + ": " + err.message;',
		'\t\t\t\t\t\t\t\t\tself.logError(\'rollback\', msg);',
		'\t\t\t\t\t\t\t\t\treturn callback( new Error(msg) ); // this is fatal',
		'\t\t\t\t\t\t\t\t}',
		'\t\t\t\t\t\t\t\tcallback(); // record already deleted, non-fatal',
		'\t\t\t\t\t\t\t} );',
		'\t\t\t\t\t\t}',
		'\t\t\t\t\t}',
		'\t\t\t\t\telse if (json.id) {',
		'\t\t\t\t\t\t// must be the file header',
		'\t\t\t\t\t\tself.logDebug(3, "Transaction rollback metadata", json);',
		'\t\t\t\t\t\treturn callback();',
		'\t\t\t\t\t}',
		'\t\t\t\t\telse {',
		'\t\t\t\t\t\t// non-fatal, file may have been partially written',
		'\t\t\t\t\t\tself.logError(\'rollback\', "Unknown JSON record type", json);',
		'\t\t\t\t\t\treturn callback();',
		'\t\t\t\t\t}',
		'\t\t\t\t}',
		'\t\t\t}',
		'\t\t},'
	].join('\n');
	var newBlock = [
		'\t\t// Helper: parse one or more JSON objects from a line (handles multiple objects on one line, e.g. Windows)',
		'\t\tfunction parseRecoveryLine(str) {',
		'\t\t\tstr = (str || \'\').trim();',
		'\t\t\tif (!str) return [];',
		'\t\t\ttry {',
		'\t\t\t\tvar one = JSON.parse(str);',
		'\t\t\t\treturn [one];',
		'\t\t\t} catch (e) {}',
		'\t\t\tvar out = [], i = 0;',
		'\t\t\twhile (i < str.length) {',
		'\t\t\t\twhile (i < str.length && (str[i] === \' \' || str[i] === \'\\t\')) i++;',
		'\t\t\t\tif (i >= str.length || str[i] !== \'{\') break;',
		'\t\t\t\tvar depth = 0, start = i;',
		'\t\t\t\tfor (; i < str.length; i++) {',
		'\t\t\t\t\tif (str[i] === \'{\') depth++;',
		'\t\t\t\t\telse if (str[i] === \'}\') {',
		'\t\t\t\t\t\tdepth--;',
		'\t\t\t\t\t\tif (depth === 0) { i++; break; }',
		'\t\t\t\t\t}',
		'\t\t\t\t}',
		'\t\t\t\ttry {',
		'\t\t\t\tout.push(JSON.parse(str.substring(start, i)));',
		'\t\t\t} catch (err) { break; }',
		'\t\t\t}',
		'\t\t\treturn out;',
		'\t\t}',
		'',
		'\t\t// read in file line by line',
		'\t\t// (file may not exist, which is fine, hence \'ignore_not_found\')',
		'\t\tTools.fileEachLine( trans.log, { ignore_not_found: true },',
		'\t\t\tfunction(line, callback) {',
		'\t\t\t\tvar objs = parseRecoveryLine(line);',
		'\t\t\t\tif (objs.length === 0) {',
		'\t\t\t\t\tif (line && line.trim()) {',
		'\t\t\t\t\t\tself.logError(\'rollback\', "Failed to parse JSON in recovery log (skipping line)", line);',
		'\t\t\t\t\t}',
		'\t\t\t\t\treturn callback();',
		'\t\t\t\t}',
		'\t\t\t\tvar idx = 0;',
		'\t\t\t\tfunction processNext() {',
		'\t\t\t\t\tif (idx >= objs.length) return callback();',
		'\t\t\t\t\tvar json = objs[idx++];',
		'\t\t\t\t\tif (json.key) {',
		'\t\t\t\t\t\tif (json.value) {',
		'\t\t\t\t\t\t\tself.put( json.key, json.value, function(err) {',
		'\t\t\t\t\t\t\t\tif (err) {',
		'\t\t\t\t\t\t\t\t\tvar msg = "Could not rollback transaction: " + path + ": Failed to restore record: " + json.key + ": " + err.message;',
		'\t\t\t\t\t\t\t\t\tself.logError(\'rollback\', msg);',
		'\t\t\t\t\t\t\t\t\treturn callback( new Error(msg) ); // this is fatal',
		'\t\t\t\t\t\t\t\t}',
		'\t\t\t\t\t\t\t\tprocessNext();',
		'\t\t\t\t\t\t\t} );',
		'\t\t\t\t\t\t}',
		'\t\t\t\t\t\telse {',
		'\t\t\t\t\t\t\tself.delete( json.key, function(err) {',
		'\t\t\t\t\t\t\t\tif (err && (err.code != "NoSuchKey")) {',
		'\t\t\t\t\t\t\t\t\tvar msg = "Could not rollback transaction: " + path + ": Failed to delete record: " + json.key + ": " + err.message;',
		'\t\t\t\t\t\t\t\t\tself.logError(\'rollback\', msg);',
		'\t\t\t\t\t\t\t\t\treturn callback( new Error(msg) ); // this is fatal',
		'\t\t\t\t\t\t\t\t}',
		'\t\t\t\t\t\t\t\tprocessNext(); // record already deleted, non-fatal',
		'\t\t\t\t\t\t\t} );',
		'\t\t\t\t\t\t}',
		'\t\t\t\t\t}',
		'\t\t\t\t\telse if (json.id) {',
		'\t\t\t\t\t\tself.logDebug(3, "Transaction rollback metadata", json);',
		'\t\t\t\t\t\tprocessNext();',
		'\t\t\t\t\t}',
		'\t\t\t\t\telse {',
		'\t\t\t\t\t\tself.logError(\'rollback\', "Unknown JSON record type", json);',
		'\t\t\t\t\t\tprocessNext();',
		'\t\t\t\t\t}',
		'\t\t\t\t}',
		'\t\t\t\tprocessNext();',
		'\t\t\t}',
		'\t\t},'
	].join('\n');
	if (code.indexOf(oldBlock) === -1) {
		console.warn('transaction.js: pattern not found, skip');
		return false;
	}
	code = code.replace(oldBlock, newBlock);
	fs.writeFileSync(file, code);
	console.log('transaction.js: patched (recovery log multi-JSON parse)');
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
patchTransaction();
console.log('\nDone. Restart Cronicle if it is running.');
