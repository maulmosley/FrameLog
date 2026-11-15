# FrameLog

A personal movie diary. Vanilla HTML/CSS/JS, Supabase (login + database), hosted on Vercel. All film info is typed in by you.

## What's in the folder
`public/` is the website. `schema.sql` creates your database tables and security rules. `build.js` turns your environment variables into `public/config.js`. `.env.example` shows which variables you need.

## Step 1: Install Node.js (one time)
Go to nodejs.org, download the LTS version, and install it with the default options. To check, open Terminal (Mac) or Command Prompt (Windows) and run `node -v`. You should see a version number.

## Step 2: Make your .env file
In this folder, copy `.env.example` to a new file named `.env` (Mac/Linux: `cp .env.example .env`; Windows: `copy .env.example .env`). Open `.env` in any text editor and put in your own Supabase URL and publishable key. Find them in Supabase under Project Settings, then API Keys. Use the publishable key only. Never paste a secret or service_role key anywhere. `.env` is already listed in `.gitignore`, so it won't be uploaded to GitHub.

## Step 3: Create the database
1. Open your project at supabase.com/dashboard.
2. In the left menu click SQL Editor, then New query.
3. Open `schema.sql` in a text editor, copy everything, paste it into the query box, and click Run.
4. You should see "Success. No rows returned." Click Table Editor and check that `profiles`, `diary_entries` and `top_four` exist. Each one should show "RLS enabled".

## Step 4: Set up login
In Supabase go to Authentication, then Sign In / Providers, and make sure Email is enabled. While you are testing, you can turn off "Confirm email" so new accounts work right away. If you leave it on, new users must click a link in their email before signing in.

## Step 5: Try it on your computer
In Terminal, `cd` into this folder and run `npm start`. If it asks to install `serve`, type `y`. Open the address it prints (usually http://localhost:3000), create an account, and log a film.

## Step 6: Put it online with Vercel
1. Create a free account at github.com, click New repository, name it `framelog`, and create it.
2. On the new repo page click "uploading an existing file". Drag in everything from this folder (including the `public` folder), but NOT `.env`. Click Commit changes.
3. Go to vercel.com, click Add New, then Project, and import your `framelog` repo.
4. Leave Framework Preset as Other. The build settings come from `vercel.json`.
5. Open Environment Variables and add two: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, with the same values as your `.env`.
6. Click Deploy. When it finishes, Vercel gives you a link like `framelog.vercel.app`.
7. Back in Supabase, go to Authentication, then URL Configuration, and set Site URL to your Vercel link. This makes email confirmation links point to your site.

If you change an environment variable later, go to Vercel, Deployments, and click Redeploy, because the values are baked in during the build.

## Using the app
Tap Log to add a film. Only the title, date and rating are required. For a poster, paste an image link (on a computer, right-click an image and choose Copy image address). Films with the same title and year can't be added twice. Home shows your totals, recent films, Top 4 and monthly activity. Films is the searchable library. Stats shows charts. Me has JSON export/import and sign out.

## Troubleshooting
"Supabase settings are missing": your `.env` or Vercel variables are not set; fix and rebuild or redeploy. "Could not load your films": schema.sql has not been run, or the URL/key is wrong. Posters not showing: the image link must be a direct link to a picture and must start with https. Can't sign in after sign-up: confirm your email, or turn off "Confirm email" in Step 4.

## Security
The publishable key is meant to be public. Your data is protected by Row Level Security in `schema.sql`, so each user can only read and change their own rows.
