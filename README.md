# Meme

Upload an image, get three AI caption options, publish one, and vote on posts. The feed and uploaded images are available to signed-in users.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` with:

```text
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
GEMINI_API_KEY=your-gemini-api-key
```

Keep Gemini and Supabase secret keys server-side. Do not prefix them with `NEXT_PUBLIC_`.

## Supabase and Google sign-in

1. Run [`supabase/assignment-3.sql`](supabase/assignment-3.sql) in Supabase SQL Editor.
2. Enable Google under **Authentication → Providers → Google** and provide your Google OAuth client ID and secret.
3. In **Authentication → URL Configuration**, set the Site URL to the deployed app URL. Add `http://localhost:3000/auth/callback` and the deployed app's `/auth/callback` URL to Redirect URLs.
4. In Google Cloud, use the Supabase provider callback URL as the OAuth client's authorized redirect URI.

## Assignment 4: image memes

1. Run [`supabase/assignment-4.sql`](supabase/assignment-4.sql) after Assignment 3. It creates the private `meme-images` Storage bucket, enables RLS, and sets up generation and vote tables and functions.
2. Set `GEMINI_API_KEY` in Vercel for each environment and redeploy.
3. Sign in, open `/create`, upload a JPG, PNG, or WebP image under 5 MB, optionally add context, choose one of three captions, and publish it.

Images are stored in private Supabase Storage. The database stores each image path, selected caption, optional context, and exact generation prompt. Votes are private per user; totals are updated by a database trigger.

## Routes

- `/` — sign-in page and members-only meme feed
- `/create` — upload an image and publish a caption
- `/profile` — update profile details and avatar
- `/inside` — protected account page
