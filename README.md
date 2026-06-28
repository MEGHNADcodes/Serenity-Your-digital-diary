# Serenity — Your Digital Diary

Serenity is a calming, web-based digital diary experience with a soft, dreamy interface. It lets you capture thoughts, save entries locally in the browser, and enjoy a peaceful journaling experience.

## Run locally

```bash
python -m http.server 3000
```

Then open http://localhost:3000.

## Deploy to Vercel

This project is ready to deploy as a static site on Vercel. Two common approaches are shown below.

Option A — Deploy via GitHub (recommended)

1. Initialize a git repo and commit your code:

```bash
git init
git add .
git commit -m "Initial commit"
```

2. Create a GitHub repository (web UI or `gh repo create`). Note: GitHub repository names cannot contain spaces; use `Serenity-Your-digital-diary` as the repo slug if you prefer.

3. Push to GitHub:

```bash
git remote add origin https://github.com/<your-username>/Serenity-Your-digital-diary.git
git branch -M main
git push -u origin main
```

4. In the Vercel dashboard, click "New Project" → Import Git Repository → pick the repo → Deploy. Vercel will detect this is a static site and publish it.

Option B — Deploy using the Vercel CLI (fast)

```bash
npm install -g vercel
vercel login
cd path/to/project
vercel --prod
```

Notes
- The included `vercel.json` sets up Vercel to serve the site and provide an SPA fallback to `index.html`.
- If you want me to create a GitHub repo and push from here, I can prepare the repo contents and provide the exact `git` commands; you'll need to run the push (or provide a GitHub token) to complete the publish step.
