-- Create storage bucket for rental agreements PDFs
-- Note: Storage buckets cannot be created via SQL migration, but this file documents the required setup

-- Required Storage Bucket:
-- rental-agreements
--   - Public: Yes (so PDFs can be accessed via download links)
--   - File size limit: 10MB (recommended for PDFs)
--   - Allowed MIME types: application/pdf

-- To create this bucket:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Click "New bucket"
-- 3. Name: rental-agreements
-- 4. Make it Public: Yes
-- 5. Set file size limit to 10MB
-- 6. Set allowed MIME types to: application/pdf

-- Storage Policies (RLS for Storage):
-- These policies allow authenticated users to upload and public users to read

-- Policy for rental-agreements bucket (upload - authenticated users)
-- CREATE POLICY "Allow authenticated users to upload rental agreements"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'rental-agreements');

-- Policy for rental-agreements bucket (read - public)
-- CREATE POLICY "Allow public read access to rental agreements"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'rental-agreements');

-- Policy for deleting rental agreements (authenticated users only)
-- CREATE POLICY "Allow authenticated users to delete rental agreements"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id = 'rental-agreements');

