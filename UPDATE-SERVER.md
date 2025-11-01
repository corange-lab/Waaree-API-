# 🔄 Server Update Instructions

## Quick Update (Run on Server)

SSH into your server and run these commands:

```bash
# Connect to server
ssh root@144.24.114.26  # or your username

# Navigate to app directory
cd ~/waaree-api

# Pull latest code
git pull origin main

# Install any new dependencies (axios is already in package.json)
npm install

# Restart PM2 service
pm2 restart waaree-api

# Check status
pm2 status waaree-api

# View logs
pm2 logs waaree-api --lines 20
```

## Test Endpoints

After restarting, test both endpoints:

```bash
# Test root endpoint (Waaree only)
curl http://localhost:8888

# Test combined endpoint (NEW!)
curl http://localhost:8888/combined
```

## From Your Local Machine

Test the live server:

```bash
# Waaree only
curl http://144.24.114.26:8888

# Combined endpoint
curl http://144.24.114.26:8888/combined
```

## Automated Deployment (Optional)

If you have SSH access configured, you can use the `deploy.sh` script:

```bash
./deploy.sh [your-username@144.24.114.26]
```

For example:
```bash
./deploy.sh root@144.24.114.26
```

