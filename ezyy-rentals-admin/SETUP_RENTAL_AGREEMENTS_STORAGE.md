# Setup Rental Agreements Storage Bucket

## Quick Setup

To enable PDF download links in emails, you need to create a storage bucket for rental agreements.

### Step 1: Create Storage Bucket

1. Go to your Supabase Dashboard: https://app.supabase.com/project/qlcbepnhuevcagszvhql/storage/buckets
2. Click **"New bucket"**
3. Configure the bucket:
   - **Name**: `rental-agreements`
   - **Public bucket**: ✅ **Yes** (checked) - This allows customers to download PDFs via the link
   - **File size limit**: 10MB (recommended for PDFs)
   - **Allowed MIME types**: `application/pdf`
4. Click **"Create bucket"**

### Step 2: Set Up Storage Policies

The bucket needs policies to allow:
- Authenticated users to upload PDFs
- Public users to read/download PDFs

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to **Storage** → **Policies** → Select `rental-agreements` bucket
2. Click **"New Policy"**

**Policy 1: Allow authenticated uploads**
- **Policy name**: "Allow authenticated users to upload rental agreements"
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**: 
  ```sql
  (bucket_id = 'rental-agreements')
  ```

**Policy 2: Allow public reads**
- **Policy name**: "Allow public read access to rental agreements"
- **Allowed operation**: SELECT
- **Target roles**: public
- **Policy definition**:
  ```sql
  (bucket_id = 'rental-agreements')
  ```

**Policy 3: Allow authenticated deletes (optional)**
- **Policy name**: "Allow authenticated users to delete rental agreements"
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**:
  ```sql
  (bucket_id = 'rental-agreements')
  ```

#### Option B: Using SQL Editor

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload rental agreements"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rental-agreements');

-- Allow public read access
CREATE POLICY "Allow public read access to rental agreements"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rental-agreements');

-- Allow authenticated users to delete (optional)
CREATE POLICY "Allow authenticated users to delete rental agreements"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rental-agreements');
```

## Verification

After setup, test by creating a new rental. The email should include a download link to the PDF instead of an attachment.

## Troubleshooting

### PDFs not uploading
- Check that the `rental-agreements` bucket exists and is public
- Verify storage policies are set correctly
- Check Edge Function logs for upload errors

### Download links not working
- Ensure the bucket is set to **Public**
- Verify the public read policy is active
- Check that the PDF was uploaded successfully (check Storage bucket contents)

### 403 errors when accessing PDFs
- Verify the public read policy is correctly configured
- Check that the bucket is set to public
- Ensure the file path in the URL is correct

## Notes

- PDFs are stored with unique filenames: `rental-{rentalId}-{timestamp}.pdf`
- Old PDFs can be manually deleted from the Storage bucket if needed
- Maximum file size: 10MB per PDF (configurable in bucket settings)

