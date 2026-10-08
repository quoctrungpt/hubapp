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

## Supabase configuration

The analytics page requires a Supabase project. Copy `.env.example` to `.env.local` and replace the example values with your project's URL and publishable key from the Supabase dashboard. For older projects, `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported:

```bash
cp .env.example .env.local
```

Restart the development server after changing `.env.local`. The rest of the app can run without these values; the analytics page will explain when Supabase has not been configured.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

This repository root contains `package.json` and the Next.js `app/` directory, so use `.` as the Vercel Root Directory (the default). Keep the Framework Preset set to Next.js and use `npm run build` as the build command. Pushing to `main` triggers a new deployment when the GitHub repository is connected.

For the `/analytics` page, add `NEXT_PUBLIC_SUPABASE_URL` and either `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Vercel project's Production environment variables, then redeploy. The `/demo` page uses pre-aggregated, anonymized data; the raw survey CSV is intentionally excluded from Git.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
