# 📋 Quick Guide: Copy Session to Server

If login works locally but not on server, you can copy the session file:

## Method 1: Using SCP (Recommended)

From your **local machine**:

```bash
# Copy session file to server
scp waaree-state.json root@144.24.114.26:~/waaree-api/

# Or if using SSH key:
scp -i /path/to/your/key.pem waaree-state.json root@144.24.114.26:~/waaree-api/
```

Then on server:
```bash
cd ~/waaree-api
chmod 644 waaree-state.json
pm2 restart waaree-api
```

## Method 2: Manual Copy

1. On local machine, open `waaree-state.json`
2. Copy the entire contents
3. SSH into server
4. Create/edit the file:
   ```bash
   cd ~/waaree-api
   nano waaree-state.json
   # Paste contents, save (Ctrl+X, Y, Enter)
   ```
5. Set permissions:
   ```bash
   chmod 644 waaree-state.json
   ```
6. Restart server:
   ```bash
   pm2 restart waaree-api
   ```

## Verify It Worked

On server:
```bash
# Check file exists and has data
ls -lh waaree-state.json
cat waaree-state.json | head -20

# Test API
curl http://localhost:8888/combined
```

Should return Waaree data, not 0!

