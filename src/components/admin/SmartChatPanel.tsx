import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Check, XCircle, Sparkles, BarChart3, Package, Tag, ImagePlus, X, Plus, MessageSquare, PanelLeftClose, PanelLeft, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };
type ToolCall = { tool: string; args: Record<string, unknown>; result: unknown };
type ChatMessage = Msg & {
  id?: string;
  tool_calls?: ToolCall[];
  pending_action?: Record<string, unknown>;
  attachments?: string[];
};
type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-chat`;

const SUGGESTED_PROMPTS = [
  { icon: Package, text: "What products do I have?", label: "View Products" },
  { icon: BarChart3, text: "How are my sales this month?", label: "Sales Report" },
  { icon: Tag, text: "Suggest prices for my catalog", label: "Pricing Help" },
  { icon: Sparkles, text: "Write descriptions for products missing one", label: "Generate Copy" },
];

export function SmartChatPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(380);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase.from('conversations') as any)
      .select('*')
      .eq('merchant_id', user.id)
      .order('updated_at', { ascending: false });
    if (data) {
      setConversations(data);
      // Also load orphan messages (conversation_id is null) into a virtual "legacy" view
    }
  };

  const loadMessages = async (conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await (supabase.from('chat_messages') as any)
      .select('*')
      .eq('merchant_id', user.id)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (data) {
      setMessages(data.map((m: any) => ({
        role: m.role,
        content: m.content,
        id: m.id,
        tool_calls: m.tool_calls || [],
        attachments: m.attachments || [],
      })));
    } else {
      setMessages([]);
    }
  };

  const selectConversation = async (conv: Conversation) => {
    setActiveConversationId(conv.id);
    await loadMessages(conv.id);
  };

  const startNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInput('');
    setAttachments([]);
  };

  const deleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await (supabase.from('conversations') as any).delete().eq('id', convId);
    if (activeConversationId === convId) {
      startNewChat();
    }
    setConversations(prev => prev.filter(c => c.id !== convId));
  };

  const createConversation = async (firstMessage: string): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
    const { data, error } = await (supabase.from('conversations') as any)
      .insert({ merchant_id: user.id, title })
      .select()
      .single();
    if (error || !data) throw new Error('Failed to create conversation');
    setConversations(prev => [data, ...prev]);
    setActiveConversationId(data.id);
    return data.id;
  };

  const saveMessage = async (msg: ChatMessage, conversationId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await (supabase.from('chat_messages') as any).insert({
      merchant_id: user.id,
      role: msg.role,
      content: msg.content,
      tool_calls: msg.tool_calls || [],
      attachments: msg.attachments || [],
      conversation_id: conversationId,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeAttachment = (idx: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && attachments.length === 0) || isLoading) return;

    // Create conversation if needed
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation(text.trim());
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: text.trim(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);
    saveMessage(userMsg, convId);

    const history = [...messages, userMsg]
      .filter(m => m.role !== 'system')
      .slice(-30)
      .map(m => ({ role: m.role, content: m.content }));

    let assistantContent = '';
    let toolCalls: ToolCall[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: history }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Request failed (${resp.status})`);
      }
      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      const upsertAssistant = (chunk: string) => {
        assistantContent += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && !last.pending_action) {
            return prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: assistantContent, tool_calls: toolCalls } : m
            );
          }
          return [...prev, { role: 'assistant', content: assistantContent, tool_calls: toolCalls }];
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.tool_calls) {
              toolCalls = parsed.tool_calls;
              for (const tc of toolCalls) {
                if ((tc.result as any)?.requires_confirmation) {
                  setMessages(prev => [
                    ...prev,
                    { role: 'assistant', content: '', tool_calls: toolCalls, pending_action: tc.result as Record<string, unknown> },
                  ]);
                }
              }
              continue;
            }
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || !raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { /* ignore */ }
        }
      }

      if (assistantContent && convId) {
        saveMessage({ role: 'assistant', content: assistantContent, tool_calls: toolCalls }, convId);
        // Update conversation title if it was the first exchange
        if (messages.length === 0) {
          await (supabase.from('conversations') as any)
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId);
        }
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errorMsg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (action: Record<string, unknown>, confirmed: boolean) => {
    setMessages(prev => prev.filter(m => m.pending_action !== action));
    if (!confirmed) {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Action cancelled.' }]);
      return;
    }
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: [], confirm_action: action }),
      });
      const result = await resp.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: result.success ? `✅ ${result.message}` : `⚠️ ${result.error || 'Action failed'}` },
      ]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : 'Action failed'}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Resize handle
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeRef.current = { startX: e.clientX, startWidth: panelWidth };
    const onMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const diff = e.clientX - resizeRef.current.startX;
      setPanelWidth(Math.max(280, Math.min(600, resizeRef.current.startWidth + diff)));
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isNewChat = activeConversationId === null && messages.length === 0;

  return (
    <div className="flex flex-shrink-0" style={{ width: panelWidth }}>
      {/* Conversation history sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 200, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex flex-col bg-background border-r border-border overflow-hidden"
          >
            {/* New chat button */}
            <div className="p-2 border-b border-border">
              <button
                onClick={startNewChat}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-display tracking-wider bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                NEW CHAT
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
              {conversations.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-4 px-2">
                  No conversations yet
                </p>
              )}
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] transition-colors group ${
                    activeConversationId === conv.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main chat panel */}
      <div className="flex-1 flex flex-col bg-sidebar border-r border-sidebar-border overflow-hidden">
        {/* Header — toggle sidebar */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-sidebar-border">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
          {activeConversationId && (
            <span className="text-[11px] font-display tracking-wider text-muted-foreground truncate">
              {conversations.find(c => c.id === activeConversationId)?.title || ''}
            </span>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* New chat: show suggestions */}
          {isNewChat && !isLoading && (
            <div className="space-y-4 pt-6">
              <div className="text-center space-y-2">
                <Sparkles className="w-7 h-7 text-accent mx-auto" />
                <h3 className="font-display text-xs font-semibold tracking-wider">AI STORE MANAGER</h3>
                <p className="text-[11px] text-muted-foreground">Ask me anything about your store.</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.label}
                    onClick={() => sendMessage(prompt.text)}
                    className="flex flex-col items-start gap-1 p-2.5 rounded-lg border border-border bg-card/50 hover:bg-card text-left transition-colors"
                  >
                    <prompt.icon className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[10px] font-medium">{prompt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active conversation with no messages loaded yet */}
          {activeConversationId && messages.length === 0 && !isLoading && !isNewChat && (
            <div className="text-center py-20 text-muted-foreground font-display tracking-wider animate-pulse text-xs">
              LOADING...
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              {msg.pending_action && (
                <ActionConfirmCard
                  action={msg.pending_action}
                  onConfirm={(confirmed) => handleConfirmAction(msg.pending_action!, confirmed)}
                />
              )}
              {(msg.content || (msg.attachments && msg.attachments.length > 0)) && (
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-card border border-border'
                    }`}
                  >
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex gap-1.5 mb-2">
                        {msg.attachments.map((src, j) => (
                          <img key={j} src={src} alt="attachment" className="w-16 h-16 object-cover rounded-md" />
                        ))}
                      </div>
                    )}
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_pre]:text-xs">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content && <p>{msg.content}</p>
                    )}
                    {msg.tool_calls && msg.tool_calls.length > 0 && !msg.pending_action && (
                      <div className="flex flex-wrap gap-1 mt-1.5 pt-1.5 border-t border-border/50">
                        {msg.tool_calls.map((tc, j) => (
                          <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
                            {tc.tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Attachment preview */}
        {attachments.length > 0 && (
          <div className="px-3 py-2 border-t border-sidebar-border flex gap-2 overflow-x-auto">
            {attachments.map((src, i) => (
              <div key={i} className="relative flex-shrink-0">
                <img src={src} alt="upload" className="w-14 h-14 object-cover rounded-md" />
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
              title="Upload image"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your AI store manager..."
              rows={1}
              className="flex-1 resize-none bg-card border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent min-h-[36px] max-h-[100px]"
              style={{ height: 'auto', overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 100) + 'px';
              }}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="h-9 w-9 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="w-1 cursor-col-resize bg-border/30 hover:bg-accent/50 transition-colors flex-shrink-0"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

function ActionConfirmCard({
  action,
  onConfirm,
}: {
  action: Record<string, unknown>;
  onConfirm: (confirmed: boolean) => void;
}) {
  const actionType = action.action as string;
  let title = 'Confirm Action';
  let description = '';

  if (actionType === 'update_product') {
    title = `Update "${action.product_title}"`;
    const changes = action.new_values as Record<string, unknown>;
    const current = action.current_values as Record<string, unknown>;
    description = Object.entries(changes).map(([k, v]) => `${k}: ${current[k]} → ${v}`).join('\n');
  } else if (actionType === 'create_product') {
    const product = action.product as Record<string, unknown>;
    title = `Create "${product.title}"`;
    description = `Price: $${product.price}\nStatus: ${product.status}`;
  } else if (actionType === 'update_inventory') {
    title = `Update Inventory: "${action.variant_title}"`;
    description = `${action.current_count} → ${action.new_count} units`;
  }

  return (
    <div className="bg-card border-2 border-accent/30 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-accent">
        <Sparkles className="w-3.5 h-3.5" />
        <span className="text-[11px] font-display tracking-wider font-semibold">{title}</span>
      </div>
      <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono">{description}</pre>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onConfirm(true)} className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90 text-xs h-7">
          <Check className="w-3 h-3" />
          Confirm
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onConfirm(false)} className="gap-1.5 text-muted-foreground text-xs h-7">
          <XCircle className="w-3 h-3" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
