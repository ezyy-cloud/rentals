# Subscription Feature Documentation

## Overview
Device types can now have monthly recurring subscriptions that need to be paid for devices to keep functioning. When a device type has a subscription enabled, individual devices can have a subscription date set.

## Database Changes

Run the migration file: `supabase/migrations/002_add_subscriptions.sql`

This adds:
- `has_subscription` (boolean) to `device_types` table
- `subscription_cost` (decimal) to `device_types` table
- `subscription_date` (date) to `devices` table

## Usage

### Device Types
1. When creating or editing a device type, check "Requires Monthly Subscription"
2. If checked, enter the monthly subscription cost
3. This enables subscription tracking for all devices of this type

### Devices
1. When creating or editing a device:
   - Select a device type
   - If the selected device type has `has_subscription = true`, a "Subscription Date" field will appear
   - Enter the next payment due date for the monthly subscription
   - This date represents when the next subscription payment is due

## Features
- Subscription date is only shown/required when the device type has subscriptions enabled
- Subscription cost is displayed in the device form when applicable
- Subscription date is shown in the devices table
- The subscription date can be updated when editing a device

