# Push to GitHub - Quick Guide

## Step 1: Create Repository on GitHub

1. Go to: https://github.com/new
2. Repository name: `polymarket-fact-checker`
3. Choose Public or Private
4. **DO NOT** check any boxes (no README, .gitignore, or license)
5. Click "Create repository"

## Step 2: Run These Commands

After creating the repository, run these commands in your terminal:

```bash
git remote add origin https://github.com/abrown84/polymarket-fact-checker.git
git push -u origin main
```

That's it! Your code will be pushed to GitHub.

## Step 3: Connect Vercel to GitHub (Optional)

Once your code is on GitHub:
1. Go to: https://vercel.com/alexs-projects-ca7bd89e/polymarket-fact-checker/settings/git
2. Click "Connect Git Repository"
3. Select your `polymarket-fact-checker` repository
4. This enables automatic deployments on every push!



