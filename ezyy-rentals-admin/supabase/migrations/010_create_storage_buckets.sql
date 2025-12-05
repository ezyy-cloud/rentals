-- Create storage buckets for images
-- Note: This SQL needs to be run in Supabase Dashboard -> Storage
-- Storage buckets cannot be created via SQL migration, but this file documents the required setup

-- Required Storage Buckets:
-- 1. device-types-images
--    - Public: Yes (so images can be accessed by customers)
--    - File size limit: 5MB (recommended)
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- 2. accessories-images
--    - Public: Yes (so images can be accessed by customers)
--    - File size limit: 5MB (recommended)
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- To create these buckets:
-- 1. Go to Supabase Dashboard -> Storage
-- 2. Click "New bucket"
-- 3. Name: device-types-images, make it Public
-- 4. Repeat for accessories-images

-- Storage Policies (RLS for Storage):
-- These policies allow authenticated users to upload and public users to read

-- Policy for device-types-images bucket (upload)
-- CREATE POLICY "Allow authenticated users to upload device type images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'device-types-images');

-- Policy for device-types-images bucket (read - public)
-- CREATE POLICY "Allow public read access to device type images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'device-types-images');

-- Policy for accessories-images bucket (upload)
-- CREATE POLICY "Allow authenticated users to upload accessory images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (bucket_id = 'accessories-images');

-- Policy for accessories-images bucket (read - public)
-- CREATE POLICY "Allow public read access to accessory images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'accessories-images');

-- Policy for deleting images (authenticated users only)
-- CREATE POLICY "Allow authenticated users to delete images"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (bucket_id IN ('device-types-images', 'accessories-images'));

