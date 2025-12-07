# Email Notification System Setup Guide

This document explains how to set up and configure the email notification system for Ezyy Rentals.

## Overview

The email notification system sends automated emails for:
- **Booking Confirmations**: Sent to customers when they make a booking (with PDF attachment)
- **Booking Notifications**: Sent to admins when a new booking is created
- **Due Return Reminders**: Sent to customers 7 days and 1 day before rental return date
- **Overdue Rental Alerts**: Sent to customers and admins when a rental is overdue
- **Subscription Due Reminders**: Sent to admins 7 days before subscription payment is due
- **Rental Agreements**: Standalone emails with PDF rental agreements

## Prerequisites

1. **Resend Account**: Sign up at [resend.com](https://resend.com) and get your API key
2. **Supabase Project**: Your Supabase project must have Edge Functions enabled
3. **System Settings**: Configure company email in the admin panel (Settings page)

## Setup Steps

### 1. Configure Resend API Key

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** → **Settings**
3. Add the following secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key (starts with `re_`)

### 2. Deploy Edge Function

The Edge Function is located at `supabase/functions/send-email/index.ts`. To deploy it:

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy send-email
```

### 3. Configure System Settings

1. Go to the admin panel
2. Navigate to **Settings**
3. Ensure the following fields are configured:
   - **Company Name**: Your company name
   - **Email**: Your company email (this will be used as the "from" address)
   - **Phone**: Your company phone number
   - **Website**: Your company website

### 4. Set Up Scheduled Jobs (Optional)

For automated email reminders, you can set up pg_cron jobs in Supabase:

1. Enable pg_cron extension in your Supabase SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

2. Schedule the email check jobs:
```sql
-- Check for rentals due in 7 days (runs daily at 9 AM)
SELECT cron.schedule(
  'check-due-returns-7days',
  '0 9 * * *',
  'SELECT check_due_returns_7days();'
);

-- Check for rentals due tomorrow (runs daily at 9 AM)
SELECT cron.schedule(
  'check-due-returns-1day',
  '0 9 * * *',
  'SELECT check_due_returns_1day();'
);

-- Check for overdue rentals (runs daily at 10 AM)
SELECT cron.schedule(
  'check-overdue-rentals',
  '0 10 * * *',
  'SELECT check_overdue_rentals();'
);

-- Check for subscriptions due (runs daily at 9 AM)
SELECT cron.schedule(
  'check-subscription-due',
  '0 9 * * *',
  'SELECT check_subscription_due();'
);
```

**Note**: The database functions log email events, but actual email sending is handled by the application layer. You can also call `notificationsService.generateNotifications()` from your application to trigger email sending.

## Email Types

### Booking Confirmation
- **Trigger**: When a rental is created
- **Recipient**: Customer
- **Includes**: PDF rental agreement attachment
- **Template**: `booking_confirmation`

### Booking Notification
- **Trigger**: When a rental is created
- **Recipient**: Admin (from system settings)
- **Template**: `booking_notification`

### Due Return Reminder (7 days)
- **Trigger**: 7 days before rental end date
- **Recipient**: Customer
- **Template**: `due_return_7days`

### Due Return Reminder (1 day)
- **Trigger**: 1 day before rental end date
- **Recipient**: Customer
- **Template**: `due_return_1day`

### Overdue Rental
- **Trigger**: When rental end date has passed
- **Recipient**: Customer and Admin
- **Template**: `overdue_rental`

### Subscription Due
- **Trigger**: 7 days before subscription payment due date
- **Recipient**: Admin
- **Template**: `subscription_due`

### Rental Agreement
- **Trigger**: Manual (can be sent anytime)
- **Recipient**: Customer
- **Includes**: PDF rental agreement attachment
- **Template**: `rental_agreement`

## Usage

### Sending Emails Programmatically

```typescript
import { emailService } from '@/lib/email-service'

// Send booking confirmation
await emailService.sendBookingConfirmation(
  rentalId,
  customerEmail,
  customerName
)

// Send due return reminder
await emailService.sendDueReturnReminder(
  rentalId,
  customerEmail,
  7 // or 1 for 1-day reminder
)

// Send overdue rental alert
await emailService.sendOverdueRental(
  rentalId,
  customerEmail,
  adminEmail
)

// Send subscription due reminder
await emailService.sendSubscriptionDue(
  deviceId,
  adminEmail,
  {
    device_name: 'Device Name',
    subscription_date: '2024-01-15',
    subscription_cost: 99.99
  }
)
```

### Generating Notifications (with Email Sending)

The `notificationsService.generateNotifications()` function automatically sends emails when generating notifications:

```typescript
import { notificationsService } from '@/lib/notifications-service'

// This will generate notifications AND send emails
await notificationsService.generateNotifications()
```

## Email Logs

All email attempts are logged in the `email_log` table for tracking and debugging:

```sql
SELECT * FROM email_log 
ORDER BY sent_at DESC 
LIMIT 50;
```

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**: Ensure `RESEND_API_KEY` is set in Supabase Edge Function secrets
2. **Check System Settings**: Ensure company email is configured in Settings
3. **Check Edge Function Logs**: View logs in Supabase dashboard under Edge Functions
4. **Check Email Logs**: Query the `email_log` table to see if emails were attempted

### PDF Attachments Not Working

Currently, PDF generation in Edge Functions is limited. The system is set up to support PDF attachments, but you may need to:
1. Pre-generate PDFs and store them in Supabase Storage
2. Use a PDF generation service
3. Generate PDFs on the client side and send them via the Edge Function

### Testing

To test email sending:

1. Create a test rental in the admin panel
2. Check that booking confirmation email is sent to customer
3. Check that booking notification email is sent to admin
4. Manually trigger `notificationsService.generateNotifications()` to test reminder emails

## Environment Variables

Required environment variables:

- `RESEND_API_KEY`: Your Resend API key (set in Supabase Edge Function secrets)
- `SUPABASE_URL`: Your Supabase project URL (automatically available in Edge Functions)
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (automatically available in Edge Functions)

## Security Notes

- The Edge Function uses Supabase service role key for database access
- Email sending is rate-limited by Resend (check your plan limits)
- Email logs are stored in the database and can be queried by authenticated users
- PDF attachments may contain sensitive customer information

## Future Enhancements

- [ ] Implement proper PDF generation in Edge Functions
- [ ] Add email templates customization in admin panel
- [ ] Add email preferences for customers
- [ ] Add email delivery status tracking
- [ ] Add email retry logic for failed sends
- [ ] Add email analytics and reporting

