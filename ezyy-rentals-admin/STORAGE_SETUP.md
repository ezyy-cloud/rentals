# Supabase Storage Setup Guide

This guide explains how to set up Supabase Storage buckets for image uploads.

## Prerequisites

- Access to your Supabase project dashboard
- Admin access to configure storage buckets

## Step 1: Create Storage Buckets

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Storage** in the left sidebar
4. Click **"New bucket"**

### Create `device-types-images` bucket:

- **Name**: `device-types-images`
- **Public bucket**: ✅ **Yes** (checked) - This allows customers to view images
- Click **"Create bucket"**

### Create `accessories-images` bucket:

- **Name**: `accessories-images`
- **Public bucket**: ✅ **Yes** (checked) - This allows customers to view images
- Click **"Create bucket"**

## Step 2: Configure Bucket Settings (Optional but Recommended)

For each bucket, you can set:

1. **File size limit**: Recommended 5MB
   - Go to bucket settings
   - Set max file size to 5MB

2. **Allowed MIME types**: Recommended to restrict to images only
   - `image/jpeg`
   - `image/png`
   - `image/webp`
   - `image/gif`

## Step 3: Set Up Storage Policies (RLS)

Storage buckets use Row Level Security (RLS) policies. You need to create policies to allow:

1. **Authenticated users to upload images**
2. **Public users to read images** (for customer-facing app)
3. **Authenticated users to delete images**

### Option A: Using Supabase Dashboard

1. Go to **Storage** → **Policies**
2. Select the `device-types-images` bucket
3. Click **"New Policy"**

#### Policy 1: Allow authenticated uploads
- **Policy name**: "Allow authenticated users to upload device type images"
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**: 
  ```sql
  (bucket_id = 'device-types-images')
  ```

#### Policy 2: Allow public reads
- **Policy name**: "Allow public read access to device type images"
- **Allowed operation**: SELECT
- **Target roles**: public
- **Policy definition**:
  ```sql
  (bucket_id = 'device-types-images')
  ```

#### Policy 3: Allow authenticated deletes
- **Policy name**: "Allow authenticated users to delete device type images"
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**:
  ```sql
  (bucket_id = 'device-types-images')
  ```

4. Repeat the same policies for `accessories-images` bucket (replace bucket name in policy definitions)

### Option B: Using SQL Editor

Run the following SQL in your Supabase SQL Editor:

```sql
-- Policies for device-types-images bucket
CREATE POLICY "Allow authenticated users to upload device type images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'device-types-images');

CREATE POLICY "Allow public read access to device type images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'device-types-images');

CREATE POLICY "Allow authenticated users to delete device type images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'device-types-images');

-- Policies for accessories-images bucket
CREATE POLICY "Allow authenticated users to upload accessory images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'accessories-images');

CREATE POLICY "Allow public read access to accessory images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'accessories-images');

CREATE POLICY "Allow authenticated users to delete accessory images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'accessories-images');
```

## Step 4: Verify Setup

1. Try uploading an image in the admin panel:
   - Go to Device Types or Accessories page
   - Create or edit an item
   - Upload an image
   - Verify it appears in the preview

2. Check that images are accessible:
   - The uploaded images should be visible in the customer-facing app
   - Image URLs should be public and accessible

## Troubleshooting

### Images not uploading
- Check that buckets are created and public
- Verify storage policies are set correctly
- Check browser console for errors
- Ensure you're authenticated as an admin user

### Images not displaying
- Verify buckets are set to **Public**
- Check that storage policies allow public SELECT
- Verify image URLs are correct (should be Supabase Storage URLs)

### Permission errors
- Ensure RLS policies are correctly configured
- Check that you're using the correct bucket names
- Verify authenticated user has proper permissions

## Notes

- Images are stored with unique filenames to prevent conflicts
- Old images are automatically deleted when removed from device types/accessories
- Maximum recommended file size: 5MB per image
- Supported formats: JPEG, PNG, WEBP, GIF

