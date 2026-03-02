# Windows compatibility fixes

This document summarizes the changes made so Cronicle runs on Windows.

## 1. Config (included in repo)

**conf/config.json** and **conf/setup.json** are included with Windows-friendly defaults:

- **conf/config.json** – Contains `"master": true`, `"hostname": "localhost"`, `"ip": "127.0.0.1"`. So this server becomes master immediately. If you already ran `node bin/storage-cli.js setup` and it registered a different hostname (e.g. your PC name or `itachi`), edit `conf/config.json` and set `hostname` and `ip` to match what setup used.
- **conf/setup.json** – Used by `node bin/storage-cli.js setup` (one-time) to create admin user, plugins, categories, and server groups. See **conf/README.md** for details.

Without matching hostname/ip, the UI may show “Waiting for master server” or “This API call can only be invoked on the master server.”

---

## 2. Code changes in this repo (already applied)

### `lib/job.js`

- **Uid/gid** – `process.getuid` / `process.getgid` don’t exist on Windows. Child options only set `uid`/`gid` when those functions exist; otherwise `USER`/`HOME` are set from `process.env`.
- **chmod** – `fs.chmodSync` on log and temp files is wrapped in `try/catch` so Windows doesn’t throw.
- **Spawning plugins** – On Windows, `.js`/`.mjs`/`.cjs` plugin commands are run as `node <script>` instead of executing the script path directly (avoids “spawn UNKNOWN”).
- **Detached runner** – On Windows, `bin/run-detached.js` is started with `node bin/run-detached.js ...` instead of the script path as the executable.

### `bin/run-detached.js`

- **Spawning plugins** – Same as above: on Windows, plugin commands ending in `.js`/`.mjs`/`.cjs` are run via `node <script>`.
- **Queue file renames** – Uses a small helper that on `EPERM`/`EEXIST` removes the destination file then renames again, so atomic writes work on Windows.

---

## 3. Patches to node_modules (run after npm install)

Two fixes are applied to `pixl-server-storage` by script (they live in `node_modules`, so they are lost after `npm install`):

1. **list.js** – In `listFind`, validate that each list page has an `items` array before use, so a bad/corrupt page doesn’t throw.
2. **engines/Filesystem.js** – In `_renameFile`, when `fs.rename` fails with `EPERM` or `EEXIST` (e.g. destination already exists on Windows), try `fs.unlink(dest)` then rename again.

**Apply patches:**

```powershell
cd c:\Users\abhid\Desktop\cronicle
node bin/apply-windows-patches.js
```

Run this again after any `npm install` (or reinstall of `pixl-server-storage`).

---

## 4. Quick checklist

1. **Config** – `conf/config.json` has `master: true` and correct `hostname`/`ip` for your cluster.
2. **Dependencies** – `npm install --ignore-scripts` (postinstall is Unix-only).
3. **Patches** – `node bin/apply-windows-patches.js` (after npm install).
4. **Start** – `$env:CRONICLE_foreground="1"; $env:CRONICLE_echo="1"; node lib/main.js`
5. **UI** – http://localhost:3012/ — create/edit events and use “Run Now” to test.

---

## 5. If you still see errors

- **“Waiting for master server”** – Check hostname/ip in config and that you ran `node bin/storage-cli.js setup` on this machine (or that this hostname is in the Primary Group in storage).
- **“This API call can only be invoked on the master server”** – Same as above; restart Cronicle after changing config.
- **“process.getuid is not a function”** – Ensure you’re using the updated `lib/job.js` (uid/gid only set when `process.getuid` exists).
- **“spawn UNKNOWN” for bin/url-plugin.js** – Ensure `lib/job.js` and `bin/run-detached.js` use `node` for `.js` plugins on Windows (see section 2).
- **“EPERM” or “Failed to rename file” when deleting events** – Run `node bin/apply-windows-patches.js` so the Filesystem engine patch is applied.
- **Job launch crash in listFind** – Run `node bin/apply-windows-patches.js` so the list.js patch is applied.
