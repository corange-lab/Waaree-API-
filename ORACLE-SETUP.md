# Oracle Cloud Security List Configuration

## Current Status
- ✅ Server running on port 8888
- ✅ UFW firewall allows port 8888
- ✅ Server listening on 0.0.0.0:8888
- ⚠️ External access needs Security List configuration

## Oracle Cloud Security List Setup

### Step-by-Step:

1. **Go to Oracle Cloud Console**
   - Navigate to: **Networking** → **Virtual Cloud Networks**

2. **Select Your VCN**
   - Find the VCN that contains your instance

3. **Open Security Lists**
   - Click on **Security Lists** in left menu
   - Select the Security List for your subnet

4. **Add Ingress Rule**
   - Click **Add Ingress Rules**
   - Configure:
     ```
     Source Type: CIDR
     Source CIDR: 0.0.0.0/0
     IP Protocol: TCP
     Source Port Range: All
     Destination Port Range: 8888
     Description: Waaree API Access
     ```
   - Click **Add Ingress Rules**

5. **Verify Route Table**
   - Check **Route Tables** → Your route table
   - Should have Internet Gateway route: `0.0.0.0/0` → Internet Gateway

6. **Check Instance**
   - Go to **Compute** → **Instances**
   - Verify your instance has a **Public IP**: `144.24.114.26`

## After Configuration

Wait 1-2 minutes for changes to propagate, then test:

```bash
curl http://144.24.114.26:8888
```

Expected response:
```json
{
  "powerOutput": "2855 Watt",
  "yieldToday": "2.8kWh",
  "spoken": "Power output is 2855 Watt. Yield today is 2.8kWh."
}
```

## Troubleshooting

If still not accessible:

1. **Verify Security List** is attached to the **correct subnet**
2. **Check Route Table** has Internet Gateway route
3. **Verify Instance** has Public IP assigned
4. **Check Network Security Groups** (if used) - add rule there too

## Server Status Check

```bash
ssh -i 'your-key.key' ubuntu@144.24.114.26
pm2 status
curl http://localhost:8888
```

