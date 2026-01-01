# 🚀 Server Deployment Guide - Complete Instructions

## Server Information
- **Server IP**: `144.24.114.26`
- **Port**: `8888`
- **User**: `ubuntu`
- **Repository**: GitHub (main branch)

---

## 📋 Prerequisites (One-Time Setup)

### 1. SSH into Server
```bash
ssh -i 'path/to/your-ssh-key.key' ubuntu@144.24.114.26
```

### 2. Install Node.js (if not installed)
```bash
# Check if Node.js is installed
node --version

# If not installed, install Node.js 18+ and npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 to start on system reboot
pm2 startup
# Run the command that PM2 outputs (it will give you a sudo command)

# Save PM2 configuration
pm2 save
```

### 4. Install Git (if not installed)
```bash
sudo apt-get update
sudo apt-get install -y git
```

### 5. Clone Repository (First Time Only)
```bash
# Navigate to home directory
cd ~

# Clone the repository
git clone https://github.com/YOUR_USERNAME/Waaree-API-.git waaree-api

# Enter the directory
cd waaree-api
```

### 6. Install Dependencies
```bash
# Install Node modules
npm install

# Install Playwright system dependencies
sudo npx playwright install-deps

# Install Chromium browser for Playwright
npx playwright install chromium
```

### 7. Configure Firewall (UFW)
```bash
# Check firewall status
sudo ufw status

# If inactive, enable it
sudo ufw enable

# Allow SSH (IMPORTANT - do this first!)
sudo ufw allow 22/tcp

# Allow port 8888 for the API
sudo ufw allow 8888/tcp

# Verify rules
sudo ufw status
```

### 8. Configure Oracle Cloud Security List
⚠️ **IMPORTANT**: Server-side firewall is not enough for Oracle Cloud!

1. Go to **Oracle Cloud Console**
2. Navigate to: **Networking** → **Virtual Cloud Networks**
3. Select your VCN
4. Click **Security Lists** → Select your security list
5. Click **Add Ingress Rules**
6. Configure:
   - **Source Type**: CIDR
   - **Source CIDR**: `0.0.0.0/0`
   - **IP Protocol**: TCP
   - **Source Port Range**: All
   - **Destination Port Range**: `8888`
   - **Description**: Waaree API Access
7. Click **Add Ingress Rules**

---

## 🎬 Initial Deployment (First Time)

### 9. Setup Session File (Choose ONE method)

#### Method A: Copy from Local Machine (Recommended)
On your **local machine**, run:
```bash
# Copy session file to server
scp -i 'path/to/your-ssh-key.key' waaree-state.json ubuntu@144.24.114.26:~/waaree-api/
```

#### Method B: Login on Server (if X11 display available)
On the **server**, run:
```bash
cd ~/waaree-api
npm run login
```

### 10. Start Server with PM2
```bash
cd ~/waaree-api

# Start the server with PM2
pm2 start server.js --name waaree-api

# Save PM2 configuration
pm2 save
```

### 11. Verify Server is Running
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs waaree-api --lines 50

# Test locally
curl http://localhost:8888

# Test combined endpoint
curl http://localhost:8888/combined
```

### 12. Test from External Network
From your **local machine**:
```bash
# Test Waaree endpoint
curl http://144.24.114.26:8888

# Test combined endpoint (Waaree + Solax)
curl http://144.24.114.26:8888/combined
```

---

## 🔄 Regular Updates & Maintenance

### Updating Code (When you make changes)

**Run these commands ON THE SERVER:**

```bash
# 1. SSH into server
ssh -i 'path/to/your-ssh-key.key' ubuntu@144.24.114.26

# 2. Navigate to app directory
cd ~/waaree-api

# 3. Pull latest code from GitHub
git pull origin main

# 4. Install any new dependencies (if package.json changed)
npm install

# 5. Restart the server
pm2 restart waaree-api

# 6. Check status
pm2 status waaree-api

# 7. View recent logs
pm2 logs waaree-api --lines 30
```

### Quick Deployment Commands (Copy-Paste)
```bash
cd ~/waaree-api && git pull origin main && npm install && pm2 restart waaree-api && pm2 logs waaree-api --lines 20
```

---

## 🛠️ Common PM2 Commands

```bash
# View all PM2 processes
pm2 list

# View logs (real-time)
pm2 logs waaree-api

# View last 50 lines of logs
pm2 logs waaree-api --lines 50

# Restart the server
pm2 restart waaree-api

# Stop the server
pm2 stop waaree-api

# Start the server (if stopped)
pm2 start waaree-api

# Delete from PM2 (complete removal)
pm2 delete waaree-api

# Monitor CPU/Memory usage
pm2 monit

# Save current PM2 configuration
pm2 save

# View detailed info
pm2 info waaree-api
```

---

## 🧪 Testing Endpoints

### From Server (localhost)
```bash
# Test Waaree endpoint
curl http://localhost:8888

# Test combined endpoint
curl http://localhost:8888/combined

# Test with refresh parameter
curl http://localhost:8888?refresh=true
```

### From External Network
```bash
# Test Waaree endpoint
curl http://144.24.114.26:8888

# Test combined endpoint
curl http://144.24.114.26:8888/combined

# Pretty print JSON response
curl http://144.24.114.26:8888/combined | jq .
```

---

## 📊 Expected API Responses

### Waaree Only (`/`)
```json
{
  "powerOutput": "1884 Watt",
  "yieldToday": "2kWh",
  "spoken": "Power output is 1884 Watt. Yield today is 2kWh."
}
```

### Combined Waaree + Solax (`/combined`)
```json
{
  "solax": {
    "powerOutput": "832 Watt",
    "yieldToday": "1.5kWh"
  },
  "waaree": {
    "powerOutput": "1884 Watt",
    "yieldToday": "2kWh"
  },
  "total": {
    "powerOutput": "2716 Watt",
    "yieldToday": "3.5kWh"
  },
  "spoken": "Solax 832 Watt, 1.5kWh. Waaree 1884 Watt, 2kWh. Total 3.5kWh.",
  "notify": "Solax 832 Watt, 1.5kWh. Waaree 1884 Watt, 2kWh. Total 3.5kWh."
}
```

---

## 🔧 Troubleshooting

### Server Not Responding
```bash
# Check if server is running
pm2 status

# Check logs for errors
pm2 logs waaree-api --err --lines 50

# Restart server
pm2 restart waaree-api

# Check if port is listening
sudo netstat -tulpn | grep 8888
# or
sudo ss -tulpn | grep 8888
```

### Session Expired (Waaree data shows as "0 Watt")
```bash
# Option 1: Copy fresh session from local machine
# (On local machine)
scp -i 'path/to/your-ssh-key.key' waaree-state.json ubuntu@144.24.114.26:~/waaree-api/

# Option 2: Update cache via POST endpoint
# (From any machine with valid session data)
curl -X POST http://144.24.114.26:8888/update-cache \
  -H "Content-Type: application/json" \
  -d '{"powerOutput":"1234 Watt","yieldToday":"5.6kWh"}'
```

### Server Using Too Much Memory
```bash
# Check memory usage
free -h

# Restart PM2 to clear memory
pm2 restart waaree-api

# View process memory usage
pm2 monit
```

### Port Already in Use
```bash
# Find process using port 8888
sudo lsof -i :8888

# Kill the process (replace PID with actual process ID)
sudo kill -9 PID

# Restart server
pm2 restart waaree-api
```

### Can't Access from Internet (Oracle Cloud)
1. Verify server is running: `pm2 status`
2. Check local firewall: `sudo ufw status`
3. **Check Oracle Cloud Security List** (most common issue!)
4. Verify public IP is correct: `curl ifconfig.me`
5. Check if port is open: `sudo netstat -tulpn | grep 8888`

---

## 📁 Important Files

| File | Description | Location |
|------|-------------|----------|
| `server.js` | Main API server | `~/waaree-api/server.js` |
| `cache.js` | Cache management | `~/waaree-api/cache.js` |
| `waaree-state.json` | Session data | `~/waaree-api/waaree-state.json` |
| `package.json` | Dependencies | `~/waaree-api/package.json` |

---

## 🎯 Quick Reference

### One-Command Test After Update
```bash
curl http://144.24.114.26:8888 && echo "" && curl http://144.24.114.26:8888/combined
```

### Full Update & Test (Single Command)
```bash
cd ~/waaree-api && git pull && npm install && pm2 restart waaree-api && sleep 3 && curl http://localhost:8888
```

### View Live Logs
```bash
pm2 logs waaree-api --lines 100
```

---

## ✅ Deployment Checklist

- [ ] Node.js installed (v18+)
- [ ] PM2 installed globally
- [ ] Repository cloned to `~/waaree-api`
- [ ] Dependencies installed (`npm install`)
- [ ] Playwright installed (`npx playwright install chromium`)
- [ ] UFW firewall configured (port 8888 allowed)
- [ ] Oracle Cloud Security List configured
- [ ] Session file copied (`waaree-state.json`)
- [ ] Server started with PM2
- [ ] PM2 configuration saved
- [ ] Server accessible from localhost
- [ ] Server accessible from internet
- [ ] Both endpoints tested (`/` and `/combined`)

---

## 🆘 Getting Help

### Check Logs for Errors
```bash
# Real-time logs
pm2 logs waaree-api

# Last 100 lines
pm2 logs waaree-api --lines 100

# Only errors
pm2 logs waaree-api --err
```

### System Resource Check
```bash
# Memory usage
free -h

# Disk usage
df -h

# CPU usage
top
# Press 'q' to quit
```

### Network Check
```bash
# Check if server is listening
sudo netstat -tulpn | grep 8888

# Check outbound connectivity
curl https://google.com

# Check public IP
curl ifconfig.me
```

---

## 📞 Support Commands Summary

```bash
# Status check
pm2 status

# View logs
pm2 logs waaree-api --lines 50

# Restart
pm2 restart waaree-api

# Full restart (stop + start)
pm2 stop waaree-api && pm2 start waaree-api

# Update code
cd ~/waaree-api && git pull && pm2 restart waaree-api

# Test endpoints
curl http://localhost:8888 && curl http://localhost:8888/combined
```

---

**Last Updated**: January 2026  
**Server IP**: `144.24.114.26:8888`  
**Status**: ✅ Running

