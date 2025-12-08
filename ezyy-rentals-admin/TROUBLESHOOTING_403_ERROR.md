# Troubleshooting 403 Error with Resend API

## Common Causes of 403 Forbidden Error

A 403 error from Resend typically means the request is understood but the server is refusing to fulfill it. Here are the most common causes and solutions:

### 1. **Unverified "From" Email Address** (Most Common)

**Problem**: The email address used in the `from` field is not verified in your Resend account.

**Solution**:
1. Go to your Resend dashboard → **Domains** or **Emails**
2. Verify the email address you're using (e.g., `info@ezyyrentals.com`)
3. If using a custom domain, you need to add and verify the domain first
4. For testing, you can use Resend's default domain: `onboarding@resend.dev` (but this is only for testing)

**How to verify**:
- Go to Resend dashboard → **Emails** → **Add Email**
- Enter your email address
- Check your inbox for verification email
- Click the verification link

### 2. **Invalid or Missing API Key**

**Problem**: The API key is incorrect, expired, or not set in Supabase Edge Function secrets.

**Solution**:
1. Check your Resend dashboard → **API Keys**
2. Ensure you're using the correct API key (starts with `re_`)
3. Verify the API key is set in Supabase:
   - Go to Supabase Dashboard → **Edge Functions** → **Settings** → **Secrets**
   - Ensure `RESEND_API_KEY` is set with the correct value
4. If the key is invalid, create a new one in Resend and update it in Supabase

### 3. **Domain Not Verified**

**Problem**: If you're using a custom domain (e.g., `@ezyyrentals.com`), the domain must be verified.

**Solution**:
1. Go to Resend dashboard → **Domains**
2. Add your domain if not already added
3. Follow the DNS verification steps:
   - Add the required DNS records (SPF, DKIM, DMARC)
   - Wait for DNS propagation (can take up to 48 hours)
   - Verify the domain status shows as "Verified"

### 4. **API Key Permissions**

**Problem**: The API key might not have the necessary permissions.

**Solution**:
1. Check your API key permissions in Resend dashboard
2. Ensure it has "Send Emails" permission
3. If using a restricted key, make sure it's not limited to specific domains

### 5. **Rate Limiting or Account Issues**

**Problem**: Your Resend account might be suspended or you've hit rate limits.

**Solution**:
1. Check your Resend dashboard for any account warnings
2. Verify your account is in good standing
3. Check if you've exceeded your plan's sending limits

## Quick Fix Steps

1. **Verify the "from" email in Resend**:
   ```
   - Go to Resend Dashboard → Emails
   - Add and verify the email from your system settings
   - Or use onboarding@resend.dev for testing
   ```

2. **Check API Key in Supabase**:
   ```bash
   # Using Supabase CLI
   supabase secrets list
   
   # Or check in Supabase Dashboard
   # Edge Functions → Settings → Secrets
   ```

3. **Test with a verified email**:
   - Temporarily change the `from` email in your system settings to a verified email
   - Or modify the Edge Function to use `onboarding@resend.dev` for testing

## Testing the Fix

After fixing the issue, test by:

1. Creating a new rental in your app
2. Check the Resend logs to see if the request succeeds
3. Verify the email is received

## Code Changes for Testing

If you want to temporarily use Resend's test domain, you can modify the Edge Function:

```typescript
// In send-email/index.ts, around line 52
const companyEmail = settings?.email ?? 'onboarding@resend.dev' // Use test domain
```

**Note**: Remember to change this back to your actual email after verifying your domain!

## Additional Debugging

Check the Edge Function logs in Supabase:
1. Go to Supabase Dashboard → **Edge Functions** → **send-email** → **Logs**
2. Look for any error messages that might give more context
3. Check if the API key is being read correctly (without logging the actual key value)

## Contact Resend Support

If none of the above solutions work:
1. Check Resend's status page
2. Review Resend's API documentation
3. Contact Resend support with:
   - Your API key (first 4 characters)
   - The exact error message
   - The email address you're trying to send from

