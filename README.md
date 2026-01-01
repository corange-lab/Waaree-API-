# Waaree Solar API

Simple, fast, and lightweight API for fetching solar power data from Waaree and Solax solar systems.

## 🌟 Features

- ✅ **Lightweight** - Uses only ~10-20MB RAM (vs 200-400MB for full browser)
- ✅ **Fast** - Cached responses in <50ms, fresh data in 2-5 seconds
- ✅ **Reliable** - Auto-retry with session management
- ✅ **Secure** - Environment variables for credentials (not hardcoded)
- ✅ **Combined Data** - Supports both Waaree and Solax solar systems

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Configure Environment Variables

Create a `.env` file:
```bash
cp .env.example .env
nano .env  # or vim, code, etc.
```

Update these required fields:
```bash
PORT=3001
WAAREE_USERNAME=your_username
WAAREE_PASSWORD=your_password
WAAREE_DEVICE_ID=your_device_id
SOLAX_API_URL=your_solax_api_url
```

**How to find your Device ID:**
1. Login to https://digital.waaree.com
2. Navigate to your inverter page
3. Check the URL: `...inverterDetail?id=YOUR_DEVICE_ID&...`
4. Copy the UUID (e.g., `3996d92f-b4e5-490a-b37e-3a617d48077c`)

### 3. Login (One-Time Setup)

```bash
npm run login
```

**Expected Output:**
```
✅ Successfully navigated away from login page
✅ Navigated to dashboard
✅ Device page loaded
⚠️ API test failed: { status: 403 }  ← IGNORE THIS (timing issue)
✅ Saved storage state to: waaree-state.json
   - LocalStorage: Yes

💡 TIP: Session saved successfully!
   To verify: npm run test
```

**Note:** The 403 warning during login is normal. It's just a timing issue where the session needs 10-20 seconds to fully activate on Waaree's servers. The session is still valid!

### 4. Verify Session (Optional but Recommended)

```bash
npm run test
```

**Expected Output:**
```
✅ Session is VALID and working!
⚡ Power: 1549 Watt
📈 Generation Today: 14.1 kWh
```

### 5. Start Server

```bash
npm start
```

**Output:**
```
✅ Server running on port 3001
📊 Local access: http://localhost:3001
🌐 Public access: http://80.225.207.88:3001

📍 Available endpoints:
   Waaree only: http://80.225.207.88:3001/
   Combined:    http://80.225.207.88:3001/combined
```

### 6. Test API

```bash
# Local
curl http://localhost:3001

# External
curl http://80.225.207.88:3001
```

## 📡 API Endpoints

### 1. Waaree Solar Only (`/`)

Returns data from Waaree Solar system only.

**URL:** 
- Local: `http://localhost:3001`
- External: `http://80.225.207.88:3001`

**Response:**
```json
{
  "powerOutput": "1549 Watt",
  "yieldToday": "14.1kWh",
  "spoken": "Power output is 1549 Watt. Yield today is 14.1kWh."
}
```

### 2. Combined Solar Systems (`/combined`)

Returns data from both Solax and Waaree systems with totals.

**URL:**
- Local: `http://localhost:3001/combined`
- External: `http://80.225.207.88:3001/combined`

**Response:**
```json
{
  "solax": {
    "powerOutput": "832 Watt",
    "yieldToday": "2kWh"
  },
  "waaree": {
    "powerOutput": "1854 Watt",
    "yieldToday": "4.9kWh"
  },
  "total": {
    "powerOutput": "2686 Watt",
    "yieldToday": "6.9kWh"
  },
  "spoken": "",
  "notify": "Solax 832 Watt, 2kWh. Waaree 1854 Watt, 4.9kWh. Total 6.9kWh."
}
```

**Note:** `spoken` field is only populated when either system has 0 power (for Siri voice feedback). `notify` field always has text.

### 3. Force Refresh (`/?refresh=true`)

Forces fresh data fetch instead of returning cached data.

**URL:** `http://80.225.207.88:3001?refresh=true`

### 4. Update Cache (POST `/update-cache`)

Manually update cache from external source.

```bash
curl -X POST http://80.225.207.88:3001/update-cache \
  -H "Content-Type: application/json" \
  -d '{"powerOutput":"1500 Watt","yieldToday":"15.0kWh"}'
```

## ⚙️ Environment Variables

All configuration is in the `.env` file:

### Required Variables

```bash
# Waaree Credentials
WAAREE_USERNAME=chirag31           # Your Waaree username
WAAREE_PASSWORD=Chirag31           # Your Waaree password
WAAREE_DEVICE_ID=3996d92f...      # Your inverter device ID (UUID)

# Solax API
SOLAX_API_URL=https://...         # Solax API endpoint
```

### Optional Variables

```bash
# Server
PORT=3001                          # Server port (default: 3001)

# Storage
WAAREE_STORAGE=waaree-state.json  # Session storage file
WAAREE_USER_DATA_DIR=.waaree-user-data  # Browser data directory

# Login
SKIP_API_TEST=false                # Skip API test during login (true/false)

# Debug
DEBUG_NETWORK=false                # Log network requests
DEBUG_RAW=false                    # Log raw API responses
```

## 🖥️ Server Deployment

### Deploy to Ubuntu Server

```bash
# 1. SSH to server
ssh ubuntu@80.225.207.88

# 2. Clone or pull repository
cd ~/Waaree-API-
git pull  # or git clone https://github.com/your-repo.git

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env
nano .env  # Update with your credentials

# 5. Login (save session)
npm run login

# 6. Test session
npm run test

# 7. Start server
npm start
```

### Open Firewall Port

**Ubuntu UFW:**
```bash
sudo ufw allow 3001/tcp
sudo ufw status
```

**Oracle Cloud:** Add ingress rule in VCN Security List for port 3001

**AWS:** Add inbound rule to Security Group for port 3001

### Run as Background Service (Optional)

Using PM2:
```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start server.js --name waaree-api

# Save configuration
pm2 save

# Auto-start on reboot
pm2 startup
```

Using systemd:
```bash
# Create service file
sudo nano /etc/systemd/system/waaree-api.service
```

```ini
[Unit]
Description=Waaree Solar API
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/Waaree-API-
ExecStart=/usr/bin/node /home/ubuntu/Waaree-API-/server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl enable waaree-api
sudo systemctl start waaree-api
sudo systemctl status waaree-api

# View logs
sudo journalctl -u waaree-api -f
```

## 🔧 How It Works

### 1. Login Phase
- Uses Playwright to automate browser login
- Saves cookies and localStorage to `waaree-state.json`
- Session persists across restarts

### 2. Data Fetching
- Uses lightweight Playwright APIRequestContext (no browser launch)
- Makes direct HTTP requests with saved session
- Memory usage: ~10-20MB instead of ~200-400MB

### 3. Caching
- Data cached for 30 minutes
- Auto-refreshes during operating hours (7 AM - 7 PM IST)
- Returns cached data instantly (<50ms)

### 4. Session Management
- Auto-detects session expiration
- Consecutive failure tracking
- Can trigger re-login when needed

## 📊 Performance

| Operation | Time |
|-----------|------|
| **Cached Response** | <50ms |
| **Fresh Fetch** | 2-5 seconds |
| **Combined Endpoint** | 3-8 seconds |

| Resource | Usage |
|----------|-------|
| **Memory (Lightweight)** | 10-20MB |
| **Memory (Full Browser)** | 200-400MB |

## 🛠️ Available Commands

```bash
npm run login    # Login and save session
npm run test     # Verify session is valid
npm start        # Start API server
```

## 📁 Project Structure

```
Waaree-API-/
├── .env                      # Your configuration (DO NOT COMMIT)
├── .env.example              # Configuration template
├── .gitignore                # Git ignore rules
├── package.json              # Dependencies
├── README.md                 # This file
├── server.js                 # Express API server
├── cache.js                  # Cache management
├── api-lightweight.js        # Lightweight HTTP client (10-20MB)
├── api.js                    # Full browser API (fallback)
├── autoLogin.js              # Auto-login module
├── test-login.js             # Session test script
└── scripts/
    ├── saveStorage.js        # Login script
    └── getEarnings.js        # Standalone earnings fetcher
```

## 🔒 Security

- ✅ `.env` file is in `.gitignore` (never committed)
- ✅ No hardcoded credentials in source code
- ✅ Session file (`waaree-state.json`) is gitignored
- ✅ Environment-specific configurations

**Best Practices:**
- Keep `.env` file secure (chmod 600)
- Use different credentials for dev/prod
- Never commit `.env` to git
- Rotate passwords regularly

## ❓ Troubleshooting

### Login Issues

**Problem:** 403 error after login
```
⚠️ API test failed: { status: 403 }
```

**Solution:** This is normal! The session needs 10-20 seconds to activate on Waaree's servers. Just ignore the warning. The session is saved and works.

To verify: `npm run test` (should pass)

---

**Problem:** "Login may have failed - still on login page"

**Solution:** Check your credentials in `.env`:
```bash
WAAREE_USERNAME=correct_username
WAAREE_PASSWORD=correct_password
```
Then run: `npm run login`

---

**Problem:** Session expired

**Solution:** Re-run login:
```bash
npm run login
```

### Server Issues

**Problem:** Port already in use

**Solution:** Change port in `.env`:
```bash
PORT=3002  # or any available port
```

---

**Problem:** Out of memory on server

**Solution:** The system uses lightweight mode by default (10-20MB). If login fails on low-memory server, login on your Mac and copy session:

```bash
# On Mac
npm run login

# Copy to server
scp .env waaree-state.json ubuntu@80.225.207.88:~/Waaree-API-/

# On server
npm start
```

---

**Problem:** Cannot access from external IP

**Solution:** Open firewall port:
```bash
sudo ufw allow 3001/tcp
```

And check if process is listening:
```bash
sudo netstat -tlnp | grep 3001
```

### API Issues

**Problem:** API returns 503 "Data not available"

**Solution:** Cache is being populated. Wait a few seconds and try again, or run:
```bash
npm run test  # Verify session
npm start     # Restart server
```

---

**Problem:** "Session expired" error in logs

**Solution:** Session has expired. Re-login:
```bash
npm run login
```

Sessions typically last several days but may expire if:
- Password changed
- Account accessed from another location
- Waaree system maintenance

## 🔍 Skip Login Warnings

If you don't want to see the 403 warnings during login:

```bash
SKIP_API_TEST=true npm run login
```

This will skip the API validation test and login cleanly without warnings.

## 📝 Notes

### About the 403 Error During Login

The login script shows a 403 error when testing the API immediately after login. **This is completely normal and expected!**

**Why it happens:**
- Your token is saved to localStorage instantly ✅
- But Waaree's backend needs 10-20 seconds to activate the session ⏳
- Direct API calls fail during this window 🚫
- But the session IS valid and will work ✅

**What to do:**
- Ignore the 403 warnings during `npm run login`
- Optionally run `npm run test` to verify (will pass)
- Or just `npm start` - the API will work perfectly

### Operating Hours

The cache auto-refreshes only during solar operating hours (7 AM - 7 PM IST). Outside these hours, it returns cached data without attempting fresh fetches.

### Memory Usage

The system automatically uses the lightweight API (`api-lightweight.js`) which uses Playwright's APIRequestContext instead of launching a full browser. This reduces memory from ~200-400MB to ~10-20MB.

## 📄 License

ISC

## 👨‍💻 Author

Solar Power Monitoring System

---

**Your API is ready!** 🚀 Access it at: `http://80.225.207.88:3001`

For issues or questions, check the Troubleshooting section above.
