# Cronicle configuration

- **config.json** – Main server config. Includes Windows-friendly defaults:
  - `master: true` – this server becomes master immediately
  - `hostname`, `ip` – set to `localhost` / `127.0.0.1` by default

  **"Server not found in cluster" in logs:** The hostname in `config.json` must match an entry in storage’s server list. If you ran `node bin/storage-cli.js setup`, it used this machine’s hostname (from `os.hostname()`). Set `hostname` and `ip` in `config.json` to that value. To use `localhost`, run setup with that hostname, e.g. `$env:HOSTNAME="localhost"; node bin/storage-cli.js setup` (only before first setup; otherwise set config to match the hostname already in storage).

- **setup.json** – Used once by `node bin/storage-cli.js setup` to create the admin user, plugins, categories, and server groups. The placeholders `_HOSTNAME_` and `_IP_` are replaced with this machine’s hostname and IP when you run setup.

- Change the default admin password after first login (admin / admin).
