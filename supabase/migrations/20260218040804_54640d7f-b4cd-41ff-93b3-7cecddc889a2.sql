-- Create storage bucket for temporary shopper image uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-uploads', 'chat-uploads', true);

-- Anyone can upload to chat-uploads (shopper-facing, no auth required)
CREATE POLICY "Anyone can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-uploads');

-- Anyone can read chat images
CREATE POLICY "Anyone can read chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-uploads');