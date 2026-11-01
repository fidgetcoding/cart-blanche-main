-- Anyone could upload to chat-uploads directly, as often as they liked. Uploads now
-- go through the chat-upload edge function, which checks the file and applies rate
-- limits, so anonymous visitors no longer need write access to storage at all.
-- Public URLs of existing and new images keep working.
DROP POLICY IF EXISTS "Anyone can upload chat images" ON storage.objects;
