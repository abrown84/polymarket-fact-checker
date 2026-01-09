# Node.js Version Issue Fix

## Problem

The app is failing to start with the error:
```
ReferenceError: fetch is not defined
```

This happens because Convex CLI version 1.31.0 requires **Node.js 18 or higher** (which includes native `fetch` support).

## Solution

### Option 1: Update Node.js (Recommended)

1. **Check your current Node.js version:**
   ```bash
   node -v
   ```

2. **If it's below 18.x, update Node.js:**
   - Download Node.js 18+ from: https://nodejs.org/
   - Or use a version manager:
     - **nvm-windows**: https://github.com/coreybutler/nvm-windows
     - **fnm**: https://github.com/Schniz/fnm

3. **After updating, verify:**
   ```bash
   node -v  # Should show v18.x.x or higher
   ```

4. **Reinstall dependencies:**
   ```bash
   npm install
   ```

### Windows/Powershell gotcha: `node -v` does nothing or pops a window

If `node -v` prints nothing (or a window flashes and closes), PowerShell may be running an **npm-installed shim** instead of your real `node.exe`.

1. **Check what `node` resolves to:**
   ```powershell
   Get-Command node -All
   where.exe node
   ```

2. **If you see `C:\Users\<you>\AppData\Roaming\npm\node.ps1` / `node.cmd` and `npm ls -g --depth=0` shows `node@...`:**
   ```bash
   npm uninstall -g node
   ```

3. **Restart your terminal and verify:**
   ```bash
   node -v
   node -p "typeof fetch"
   ```

5. **Try running again:**
   ```bash
   npm run dev
   ```

### Option 2: Use Convex Cloud (Skip Local Dev)

If you can't update Node.js right now, you can:

1. **Deploy to Convex Cloud:**
   ```bash
   npx convex deploy
   ```

2. **Run client only (without Convex dev server):**
   ```bash
   cd client
   npm run dev
   ```

   Note: This will only work if you've already deployed your Convex functions to the cloud.

### Option 3: Downgrade Convex (Not Recommended)

You could downgrade Convex to an older version, but this is not recommended as you'll lose features and bug fixes.

## Quick Check

Run this to see your Node version:
```bash
node -v
```

If it shows `v16.x.x` or lower, you need to update to v18+.

## Why This Happens

Node.js 18 introduced native `fetch` support. Convex CLI 1.31.0 uses this feature, so it requires Node.js 18+.

## After Fixing

Once Node.js is updated to 18+, the app should start normally:
```bash
npm run dev
```

This will:
1. Start Convex dev server
2. Start the Vite client dev server
3. Open the app in your browser
