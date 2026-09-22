# Cashio cloud setup

Cashio now has two selectable data modes:

- Offline: all financial data stays on the device.
- Cloud: the user signs up/signs in with email + password and cloud data is stored per user.

The browser/Android client uses only Supabase's publishable key. Never put a Supabase secret/service-role key in the app.

## 1. Create the Supabase project

Create a Supabase project, then obtain:

- Project URL
- Publishable key

Supabase documents the browser-side connection values and publishable key flow. The publishable key is intended for public client applications; authorization must be enforced with RLS. See the official Supabase docs.

## 2. Create the database tables

Open Supabase SQL Editor and run:

`supabase/schema.sql`

The script creates the Cashio transaction/category tables and RLS policies so an authenticated user can only read/write rows whose `user_id` matches `auth.uid()`.

## 3. Configure email OTP

Cashio's signup screen asks the user for the password and then a verification code received by email.

In Supabase Dashboard:

Authentication → Email Templates → Confirm signup

Use an email template that visibly contains:

`{{ .Token }}`

For example:

`<h2>Cashio verification code</h2><p>Your verification code is:</p><h1>{{ .Token }}</h1>`

Keep email confirmations enabled.

For production volume, configure a custom SMTP provider. Supabase's built-in email service is best-effort and currently has a low sending limit, so it is not appropriate for a commercial app at scale.

## 4. Configure the build

Add these GitHub Actions repository secrets:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

They are injected into the web and Android release builds.

For local development, copy `.env.example` to `.env.local` and fill in the same values.

## 5. Configure the site URL

In Supabase Authentication URL configuration, add:

`https://zior6645-rgb.github.io/dakhl-kharj-man/`

and the exact development URL you use locally.

## 6. User flow

Signup:
1. User selects Cloud.
2. User enters email/Gmail and password.
3. Supabase sends the signup verification code.
4. User enters the code.
5. Account becomes usable.

Later login:
1. User enters email/Gmail.
2. User enters the password created during signup.
3. Cashio receives a cloud session and loads that user's data.

Offline mode never requires this account.

