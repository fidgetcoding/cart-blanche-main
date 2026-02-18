
-- Create chat_messages table for Smart Chat persistence
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  tool_calls jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index for efficient merchant-scoped queries
CREATE INDEX idx_chat_messages_merchant ON public.chat_messages(merchant_id, created_at);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Merchants can CRUD their own messages
CREATE POLICY "Merchants can manage own chat messages"
  ON public.chat_messages
  FOR ALL
  USING (auth.uid() = merchant_id)
  WITH CHECK (auth.uid() = merchant_id);
