-- Create storage bucket for product media (images and videos)
INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true);

-- Allow authenticated users to upload product media
CREATE POLICY "Authenticated users can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-media' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update product media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-media' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete product media"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-media' AND auth.role() = 'authenticated');

-- Allow public read access to product media
CREATE POLICY "Public can read product media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');