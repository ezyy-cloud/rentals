# Deploy Edge Function to Supabase

## Prerequisites

1. Supabase CLI installed (`supabase` command available)
2. Logged in to Supabase CLI: `supabase login`
3. Your Supabase project reference (found in your Supabase dashboard URL)

## Deployment Steps

### Option 1: Deploy with Project Reference (Recommended)

1. Get your project reference from your Supabase dashboard:
   - Go to your Supabase project dashboard
   - The project reference is in the URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`
   - Or go to Settings → General → Reference ID

2. Deploy the function:
   ```bash
   cd ezyy-rentals-admin
   supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
   ```

### Option 2: Link Project First

1. Link your project:
   ```bash
   cd ezyy-rentals-admin
   supabase link --project-ref YOUR_PROJECT_REF
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy send-email
   ```

### Option 3: Deploy via Supabase Dashboard

1. Go to your Supabase dashboard → Edge Functions
2. Click "Create a new function" or select the existing `send-email` function
3. Copy the contents of `supabase/functions/send-email/index.ts`
4. Paste into the function editor
5. Click "Deploy"

## Set Environment Variables (Secrets)

After deploying, you need to set the `RESEND_API_KEY` secret:

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here --project-ref YOUR_PROJECT_REF
```

Or via Supabase Dashboard:
1. Go to Edge Functions → Settings → Secrets
2. Add new secret:
   - Name: `RESEND_API_KEY`
   - Value: Your Resend API key (starts with `re_`)

## Verify Deployment

1. Check function logs:
   ```bash
   supabase functions logs send-email --project-ref YOUR_PROJECT_REF
   ```

2. Test the function by creating a rental in your app

## Troubleshooting

- **"Cannot connect to Docker"**: This is normal if deploying to remote. Use `--project-ref` flag.
- **"Project not linked"**: Use Option 1 or 2 above to provide the project reference.
- **"Function not found"**: Make sure you're in the `ezyy-rentals-admin` directory.

