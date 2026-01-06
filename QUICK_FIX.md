# Quick Fix for App Not Running

## The Problem

Convex CLI requires **Node.js 18 or higher**. The error `fetch is not defined` means your Node.js version is too old.

## Immediate Solution

### Step 1: Check Node Version
```bash
node -v
```

If it shows `v16.x.x` or lower, you need to update.

### Step 2: Update Node.js

**Windows (Recommended - Download Installer):**
1. Go to https://nodejs.org/
2. Download the **LTS version** (should be 20.x or 22.x)
3. Run the installer
4. Restart your terminal

**Or use nvm-windows:**
```bash
# Install nvm-windows from: https://github.com/coreybutler/nvm-windows
nvm install 20
nvm use 20
```

### Step 3: Verify and Run
```bash
node -v  # Should show v18.x.x or higher
npm install
npm run dev
```

## Alternative: Run Client Only

If you can't update Node.js right now, you can run just the frontend:

```bash
cd client
npm run dev
```

**Note:** This will only work if your Convex backend is already deployed to the cloud. The frontend won't be able to connect to a local Convex dev server.

## Why This Happens

- Convex 1.31.0 uses native `fetch` API
- `fetch` was added in Node.js 18
- Older Node versions don't have `fetch` built-in

## After Updating Node.js

Once you have Node.js 18+, everything should work:
```bash
npm run dev
```

This starts both:
- Convex dev server (backend)
- Vite dev server (frontend)
