# Deployment Guide

## GitHub Setup

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Name it `polymarket-fact-checker` (or your preferred name)
   - Choose public or private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)

2. **Push your code to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/polymarket-fact-checker.git
   git push -u origin main
   ```

## Vercel Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign in with your GitHub account

2. **Import your project:**
   - Click "Add New Project"
   - Select your `polymarket-fact-checker` repository
   - Vercel will auto-detect the settings from `vercel.json`

3. **Configure Environment Variables:**
   Add these in Vercel's project settings:
   - `VITE_CONVEX_URL` - Your Convex deployment URL
   - `OPENROUTER_API_KEY` - Your OpenRouter API key (if not already in Convex)

4. **Deploy:**
   - Click "Deploy"
   - Vercel will build and deploy your app

### Option 2: Deploy via CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set Environment Variables:**
   ```bash
   vercel env add VITE_CONVEX_URL
   vercel env add OPENROUTER_API_KEY
   ```

## Convex Deployment

1. **Deploy Convex functions:**
   ```bash
   npx convex deploy
   ```

2. **Get your Convex URL:**
   - After deployment, Convex will provide a deployment URL
   - Add this as `VITE_CONVEX_URL` in Vercel environment variables

## Post-Deployment Checklist

- [ ] GitHub repository is set up and code is pushed
- [ ] Vercel project is created and linked to GitHub
- [ ] Environment variables are set in Vercel
- [ ] Convex functions are deployed
- [ ] Build completes successfully on Vercel
- [ ] App is accessible at the Vercel URL
- [ ] Test the fact-checking functionality

## Troubleshooting

### Build Fails
- Check Vercel build logs for errors
- Ensure all environment variables are set
- Verify `vercel.json` configuration is correct

### Convex Connection Issues
- Verify `VITE_CONVEX_URL` is set correctly in Vercel
- Check that Convex deployment is active
- Review Convex dashboard for any errors

### API Errors
- Ensure OpenRouter API key is set in Convex environment variables
- Check Convex function logs for API call errors



