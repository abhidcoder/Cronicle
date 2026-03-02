# Cronicle configuration

- **config.json** – Main server config. Includes Windows-friendly defaults:
  - `master: true` – this server becomes master immediately
  - `hostname`, `ip` – set to `localhost` / `127.0.0.1` by default

  **After first-time setup:** If you run `node bin/storage-cli.js setup`, it will register this machine with a hostname from `os.hostname()`. If that hostname is not `localhost`, update `conf/config.json` and set `hostname` and `ip` to the values that setup printed (so this server is recognized as the primary master).

- **setup.json** – Used once by `node bin/storage-cli.js setup` to create the admin user, plugins, categories, and server groups. The placeholders `_HOSTNAME_` and `_IP_` are replaced with this machine’s hostname and IP when you run setup.

- Change the default admin password after first login (admin / admin).
