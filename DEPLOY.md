# 🚀 Deployment Guide

## Quick Deploy to Render.com (Free)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Deploy on Render

1. Go to [render.com](https://render.com) → Sign up
2. Click **"New"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `waaree-earnings-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx playwright install chromium`
   - **Start Command**: `npm start`
   - **Plan**: Free
5. Click **"Create Web Service"**

### Step 3: First-Time Login

After deployment:

1. Go to Render dashboard → Your service → **"Shell"**
2. Run:
   ```bash
   npm run login
   ```
3. Browser will open automatically for login
4. Login completes and saves session

**Your API will be live at**: `https://your-app-name.onrender.com`

## 🎯 API Endpoint

Once deployed, visit:
```
https://your-app-name.onrender.com
```

**Response:**
```json
{
  "powerOutput": "162 Watt",
  "yieldToday": "0.4kWh",
  "spoken": "Power output is 162 Watt. Yield today is 0.4kWh."
}
```

## 🔄 Update Session (When Expired)

Run in Render Shell:
```bash
npm run login
```

## 📋 Files Included

- `server.js` - Main API server
- `api.js` - Earnings fetching logic
- `scripts/saveStorage.js` - Login script
- `scripts/getEarnings.js` - Core earnings function

## ✅ Ready to Deploy!

Your project is configured and ready for deployment.


