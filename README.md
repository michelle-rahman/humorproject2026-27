This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Assignment 3: Google sign-in and profiles

### Supabase setup

1. In Supabase, open **SQL Editor** and run [`supabase/assignment-3.sql`](supabase/assignment-3.sql). It creates a `profiles` row when a new Auth user is added and a public `avatars` Storage bucket with per-user upload policies.
2. In **Authentication → Providers → Google**, enable Google and enter your Google OAuth client ID and secret.
3. In **Authentication → URL Configuration**, set the Site URL to your app's base URL. Add these app callback URLs to Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR-VERCEL-DOMAIN/auth/callback`

### Google OAuth setup

Create a Google OAuth client with application type **Web application**. For Authorized JavaScript origins, add `http://localhost:3000` and your Vercel site's base URL. For Authorized redirect URIs, use the Supabase provider callback shown in Supabase's Google provider setup, normally `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`.

The app's `redirectTo` is exactly `/auth/callback`. Supabase sends the user back to that app route with its OAuth code, and the route exchanges the code for a session before forwarding the user to `/profile`.

### Environment variables

Set these in `.env.local` for local development and in Vercel for Production, Preview, and Development:

```text
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Never add a Supabase `service_role` key or Google client secret to these app variables.

### App routes

- `/` is the public caption list and Google sign-in entry point.
- `/profile` lets a signed-in user update their first and last name and upload an avatar.
- `/inside` is protected and redirects signed-out visitors to the home page.
