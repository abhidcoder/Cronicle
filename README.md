# Cronicle


https://github.com/abhidcoder/Cronicle/blob/cronicleChanges/unnamed.png

## Problem Statement

Managing scheduled, repeating, and on-demand jobs across a distributed infrastructure often requires complex setups, external databases, and limited real-time visibility. Organizations need a way to orchestrate tasks across multiple servers without the overhead of heavy database dependencies, manual IP configuration, or fragile coordination mechanisms.

## Solution Overview

**Cronicle** is a multi-server task scheduler and runner built with **Node.js**, designed around a distributed **Master–Slave architecture**.  
The master server provides a visual web-based UI for scheduling and orchestration, while slave servers execute jobs based on configurable run modes.

Cronicle offers real-time visibility into job execution, including **live log streaming**, **CPU usage**, and **memory tracking** across the entire cluster. It simplifies deployment by:

- Using **auto-discovery** for new servers
- Avoiding external databases by storing all configuration and state as **JSON files on disk**

---

## Architecture

Cronicle follows a **Master–Slave Distributed Model**.

### Master Server
- Central hub for the web-based UI
- Handles all scheduling logic
- Maintains a master list of all completed jobs
- Provides analytics, logs, and cluster-wide visibility

### Slave Servers
- Execution nodes for dispatched jobs (scripts or plugins)
- Track CPU and memory usage, including child processes
- Stream real-time logs and stats back to the master

### Discovery & Storage
- **Auto-discovery** identifies nearby servers automatically
- **Database-less architecture**: all data stored as local JSON files

### Deployment Notes
- Self-hosted and open source
- For auto-discovery, VM instances should be hosted within the same **VPC**
- Since standard network broadcasts may be restricted (e.g., on GCP), ensure firewall rules allow internal communication between master and slave instances

---

## Tech Stack

- **Frontend**: Skeleton.css, Normalize.css, jQuery, Font Awesome  
- **Backend**: Node.js  
- **Database**: None (JSON files on disk)  
- **Cloud / Infrastructure**:
  - Distributed cluster
  - Auto-discovery
  - Auto-failover
  - API Key–based REST API for remote integrations

---

## Features

### Scheduling & Orchestration
- **Visual Event Scheduler**  
  Schedule one-time or recurring events using a powerful visual multi-selector that supports:
  - Any combination of time units
  - Multiple timezones

- **Chain of Events**  
  Automatically trigger subsequent jobs when a task completes, passing custom data between events to ensure sequential execution.

### Monitoring & Analytics
- **Real-Time Monitoring**
  - Live log streaming
  - Graphical progress bars
  - Estimated time remaining for running jobs

- **Distributed Resource Tracking**
  - Tracks CPU and memory usage for main and child processes
  - Historical graphs to detect performance trends

- **Analytical Dashboard**
  - Centralized real-time stats
  - Pie charts and historical graphs
  - Visualization of custom performance metrics

### Extensibility & Control
- **Extensible Plugin System**
  - Write plugins in any language using a simple JSON protocol
  - Define custom UI controls (text fields, checkboxes, etc.) via the Parameter system

- **User-Defined Execution Limits**
  - Set custom CPU and memory limits
  - Configure sustain thresholds at category or event level
  - Avoid arbitrary hard-coded timeouts

- **Intelligent Task Queuing**
  - High concurrency support
  - Randomized load balancing across server groups

### Security & Reliability
- **User-Based Access & Security**
  - Web-based management UI
  - External JSON REST API secured with API keys

- **Retry & Alerts**
  - Automatic retries for failed jobs
  - Alerting mechanisms for failures and thresholds

### Performance & Cost
- **Cost-Effective & Lightweight**
  - Open-source (MIT Licensed)
  - No external database required
  - Minimal infrastructure overhead

- **High Scalability**
  - No inherent software limits on cluster size
  - Scale to any number of slave servers

---

## Setup Instructions

1. Install **Node.js** on your primary server.
2. Log in as `root`.
3. Run the auto-install script:
   ```bash
   curl -s https://raw.githubusercontent.com/jhuckaby/Cronicle/master/bin/install.js | node
   ```

---

## Running on Windows

### 1. One-time setup (if you haven’t already)

**Install dependencies:**
```powershell
cd c:\Users\abhid\Desktop\cronicle
npm install --ignore-scripts
```

**Apply Windows patches (run after every `npm install`):**
```powershell
node bin/apply-windows-patches.js
```

**One-time storage setup (creates admin user and default data):**
```powershell
node bin/storage-cli.js setup
```
- If it says “Storage has already been set up”, you can skip this.
- If it runs, note the hostname it prints. If it’s not `localhost`, edit `conf/config.json` and set `hostname` and `ip` to that hostname and your machine’s IP.

**Prepare the web UI (fixes 404):**
```powershell
node bin/prepare-ui-windows.js
```
This creates `htdocs/index.html` and copies JS/CSS/fonts from `node_modules` into `htdocs`. Run it after `npm install`; if you get 404 in the browser, run it again and restart Cronicle.

### 2. Start Cronicle

```powershell
cd c:\Users\abhid\Desktop\cronicle
$env:CRONICLE_foreground="1"
$env:CRONICLE_echo="1"
node lib/main.js
```

Or in one line:
```powershell
cd c:\Users\abhid\Desktop\cronicle; $env:CRONICLE_foreground="1"; $env:CRONICLE_echo="1"; node lib/main.js
```

Keep this terminal open while using Cronicle.

### 3. Use the web UI

1. Open **http://localhost:3012/** in your browser.
2. Log in with **admin** / **admin** (change the password after first login).
3. Create or run events from the Schedule page.

### 4. Stop Cronicle

In the terminal where it’s running, press **Ctrl+C**.

### If you get 404 or a blank UI (only footer visible)

1. Run **`node bin/prepare-ui-windows.js`** (must be run **after** `npm install` so it can copy jQuery, Moment, etc. into `htdocs`).
2. Restart Cronicle, then hard-refresh the page (**Ctrl+F5**).
3. If still blank, open **F12** → **Console** and check for red errors; open **Network** and see if any script or CSS returns 404. Fix any missing files by running the prepare script again.

### Quick start (if setup is already done)

```powershell
cd c:\Users\abhid\Desktop\cronicle
$env:CRONICLE_foreground="1"; $env:CRONICLE_echo="1"; node lib/main.js
```
Then open http://localhost:3012/ and log in with **admin** / **admin**.

