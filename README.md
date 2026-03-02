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

