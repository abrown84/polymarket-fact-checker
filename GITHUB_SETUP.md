# GitHub Setup Instructions

## Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Repository name: `polymarket-fact-checker`
3. Description (optional): "AI-powered fact checker using Polymarket prediction markets"
4. Choose **Public** or **Private**
5. **IMPORTANT:** Do NOT initialize with:
   - ❌ README
   - ❌ .gitignore
   - ❌ license
   
   (We already have these files)

6. Click **"Create repository"**

## Step 2: Push Your Code

After creating the repository, GitHub will show you commands. Use these:

```bash
git remote add origin https://github.com/YOUR_USERNAME/polymarket-fact-checker.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Step 3: Connect Vercel to GitHub (Optional)

Once your code is on GitHub:
1. Go to your Vercel project: https://vercel.com/alexs-projects-ca7bd89e/polymarket-fact-checker
2. Go to Settings → Git
3. Connect your GitHub repository
4. This will enable automatic deployments on every push!


