# Travel Assistant — Supabase Backend Setup Guide

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **New project**
3. Fill in:
   - **Name**: `travel-assistant`
   - **Database password**: choose a strong password (save it!)
   - **Region**: pick the closest to Ethiopia (e.g., `eu-west-1` or `me-central-1`)
4. Click **Create new project** — wait ~2 minutes for provisioning

---

## Step 2: Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor** → **New query**
2. Copy the entire contents of `supabase/schema.sql`
3. Paste it into the editor and click **Run**
4. Verify: Go to **Table Editor** — you should see `profiles`, `trips`, `saved_places`

---

## Step 3: Get Your API Keys

Go to **Project Settings → API**:

| Variable | Where to find it |
|---|---|
| `SUPABASE_URL` | "Project URL" |
| `SUPABASE_ANON_KEY` | "anon public" key |
| `SERVICE_ROLE_KEY` | "service_role" key (**keep secret — server only**) |

Create a `.env` file in your project root (copy from `.env.example`):
```bash
cp .env.example .env
# Then fill in your actual values
```

---

## Step 4: Install the Supabase CLI

```bash
brew install supabase/tap/supabase
```

Then link your project:
```bash
cd /Users/Learning/Desktop/travel-assistant
supabase login
supabase link --project-ref YOUR_PROJECT_ID
```

> Your project ID is in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_ID`

---

## Step 5: Set Edge Function Secrets

Edge functions need environment variables set in Supabase (not in `.env`):

```bash
supabase secrets set SERVICE_ROLE_KEY=your-service-role-key
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically injected by Supabase into every edge function — you do NOT need to set them manually.

---

## Step 6: Deploy All Edge Functions

```bash
supabase functions deploy get-visa-info
supabase functions deploy get-safety-info
supabase functions deploy get-weather
supabase functions deploy get-electrical
supabase functions deploy save-trip
supabase functions deploy get-trips
supabase functions deploy delete-trip
```

Or deploy all at once (if supported by your CLI version):
```bash
for fn in get-visa-info get-safety-info get-weather get-electrical save-trip get-trips delete-trip; do
  supabase functions deploy $fn
done
```

---

## Step 7: Install the Client SDK

```bash
cd /Users/Learning/Desktop/travel-assistant
npm install @supabase/supabase-js
```

---

## Step 8: Test with curl

### Test `get-visa-info` (no auth required)
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-visa-info \
  -H "Content-Type: application/json" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4d2VjeGtxYWN3Y3B0bm9mY3V4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MTc3NjQsImV4cCI6MjA5MzM5Mzc2NH0.p4HK8zmIoylFos16cT7dlYppjWtee8NfRp3qjJXFUyU" \
  -d '{"citizenship": "ethiopia", "destination": "uae"}'
```

### Test `get-weather`
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-weather \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"destination": "kenya", "start_date": "2025-06-01"}'
```

### Test `get-electrical`
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-electrical \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"destination": "france"}'
```

### Test `save-trip` (auth required — needs a real JWT)
```bash
# First get a token by signing in:
curl -X POST https://YOUR_PROJECT_ID.supabase.co/auth/v1/token?grant_type=password \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{"email": "user@example.com", "password": "yourpassword"}'

# Then use the access_token from the response:
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/save-trip \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"destination": "Kenya", "start_date": "2025-06-01", "end_date": "2025-06-08", "notes": "Safari trip"}'
```

### Test `get-trips`
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/get-trips \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{}'
```

### Test `delete-trip`
```bash
curl -X POST https://YOUR_PROJECT_ID.supabase.co/functions/v1/delete-trip \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"trip_id": 1}'
```

---

## Environment Variables Summary

| Variable | Used by | Where to set |
|---|---|---|
| `VITE_SUPABASE_URL` | React client | `.env` file |
| `VITE_SUPABASE_ANON_KEY` | React client | `.env` file |
| `SUPABASE_URL` | Edge functions | Auto-injected by Supabase |
| `SUPABASE_ANON_KEY` | Edge functions | Auto-injected by Supabase |
| `SERVICE_ROLE_KEY` | Edge functions | `supabase secrets set` |

> ⚠️ **Never** expose `SERVICE_ROLE_KEY` in client-side code or `.env` files committed to git.
> Your `.gitignore` should include `.env`.
