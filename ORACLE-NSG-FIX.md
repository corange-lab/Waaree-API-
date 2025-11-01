# Fix: Oracle Cloud Network Security Groups (NSGs)

## The Problem
Security List rule added but still getting "Connection Refused" - this is because **NSGs override Security Lists**!

## Solution: Add Rule to Network Security Groups

### Step 1: Find Your NSG
1. Go to **Oracle Cloud Console**
2. **Networking** → **Network Security Groups**
3. Find the NSG attached to your instance (check instance details → "Network Security Groups")

### Step 2: Add Ingress Rule
1. Click on your NSG
2. Go to **Security Rules** tab
3. Click **Add Ingress Rules**
4. Configure:
   ```
   Source Type: CIDR
   Source: 0.0.0.0/0
   IP Protocol: TCP
   Source Port Range: (leave blank)
   Destination Port Range: 8888
   Description: Waaree API Port 8888
   ```
5. Click **Add Ingress Rules**

### Step 3: Verify
Wait 1-2 minutes, then test:
```bash
curl http://144.24.114.26:8888
```

## Why This Happens

Oracle Cloud has **two firewall layers**:
1. **Security Lists** - Subnet-level (you configured this ✅)
2. **Network Security Groups (NSGs)** - Instance-level (blocks if configured ⚠️)

If your instance has NSGs attached, they **override** Security Lists!

## Quick Check

Check if your instance uses NSGs:
1. **Compute** → **Instances**
2. Click your instance
3. Look at **"Network Security Groups"** section
4. If you see NSG listed, add the rule there!

