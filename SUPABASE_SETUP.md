# Cashio — Supabase setup

Cashio keeps its core finance data usable offline. Cloud storage and email/password accounts are optional.

## 1. Create the database

Open the Supabase SQL Editor and run:

`supabase/schema.sql`

This creates the two Cashio tables and the row-level security policies that restrict records to the signed-in user.

## 2. Enable email/password authentication

In Supabase Auth, enable the Email provider and keep email confirmation enabled when you want the six-digit verification-code flow in Cashio.

Cashio uses the Auth REST endpoints for:
- email/password signup
- six-digit email signup verification
- resend verification code
- password sign-in
- password recovery
- session refresh

The email confirmation template should include the OTP variable:

`{{ .Token }}`

Supabase documents `{{ .Token }}` as the six-digit OTP that can be verified with the email OTP flow. A custom SMTP provider is recommended for real users.

## 3. Configure deployment variables

The web and Android release workflows read these GitHub Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The values must point to the same Supabase project where `supabase/schema.sql` was executed.

Do not put a Supabase service-role key in the app. Cashio only needs the public publishable/anon key on the client, protected by RLS.

## 4. Redirects

For the password-based flow, configure the deployed Cashio web address as an allowed site/redirect URL in Supabase Auth settings.

## 5. Production email

Supabase's built-in email sending is suitable for testing but has restrictions and rate limits. Configure a custom SMTP provider before releasing the cloud account feature to general users.

## Important

Without the two deployment variables and the Supabase project configuration above, the Cashio cloud buttons are intentionally shown as not configured rather than pretending that cloud storage works.
