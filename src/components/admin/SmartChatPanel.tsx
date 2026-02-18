import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2, Check, XCircle, Sparkles, BarChart3, Package, Tag } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };
type ToolCall = { tool: string; args: Record<string, unknown>; result: unknown };
type ChatMessage = Msg & {
  id?: string;
  tool_calls?: ToolCall[];
  pending_action?: Record<string, unknown>;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/smart-chat`;

const SUGGESTED_PROMPTS = [
  { icon: Package, text: "What products do I have?", label: "View Products" },
  { icon: BarChart3, text: "How are my sales this month?", label: "Sales Report" },
  { icon: Tag, text: "Suggest prices for my catalog", label: "Pricing Help" },
  { icon: Sparkles, text: "Write descriptions for products missing one", label: "Generate Copy" },
];

export function SmartChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [panelWidth, setPanelWidth] = useState(420);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!isOpen) return;
    loadHistory();
  }, [isOpen]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase.from('chat_messages') as any)
      .select('*')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data && data.length > 0) {
      setMessages(data.map((m: any) => ({
        role: m.role,
        content: m.content,
        id: m.id,
        tool_calls: m.tool_calls || [],
      })));
    }
  };

  const saveMessage = async (msg: ChatMessage) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase.from('chat_messages') as any).insert({
      merchant_id: user.id,
      role: msg.role,
      content: msg.content,
      tool_calls: msg.tool_calls || [],
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Save user message
    saveMessage(userMsg);

    // Build message history for API (last 30 messages for context)
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

            // Check for tool call metadata
            if (parsed.tool_calls) {
              toolCalls = parsed.tool_calls;

              // Check if any require confirmation
              for (const tc of toolCalls) {
                if ((tc.result as any)?.requires_confirmation) {
                  setMessages(prev => [
                    ...prev,
                    {
                      role: 'assistant',
                      content: '',
                      tool_calls: toolCalls,
                      pending_action: tc.result as Record<string, unknown>,
                    },
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

      // Flush remaining
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

      // Save assistant message
      if (assistantContent) {
        saveMessage({ role: 'assistant', content: assistantContent, tool_calls: toolCalls });
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Something went wrong';
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${errorMsg}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAction = async (action: Record<string, unknown>, confirmed: boolean) => {
    // Remove the pending action card
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
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : 'Action failed'}` },
      ]);
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
      const diff = resizeRef.current.startX - e.clientX;
      setPanelWidth(Math.max(320, Math.min(700, resizeRef.current.startWidth + diff)));
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

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Sparkles className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex"
            style={{ width: panelWidth }}
          >
            {/* Resize handle */}
            <div
              className="w-1.5 cursor-col-resize bg-border/50 hover:bg-accent/50 transition-colors flex-shrink-0"
              onMouseDown={handleResizeStart}
            />

            {/* Panel content */}
            <div className="flex-1 flex flex-col bg-sidebar border-l border-sidebar-border overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <h2 className="font-display text-sm font-semibold tracking-wider">SMART CHAT</h2>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-md hover:bg-sidebar-accent transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !isLoading && (
                  <div className="space-y-4 pt-8">
                    <div className="text-center space-y-2">
                      <Sparkles className="w-8 h-8 text-accent mx-auto" />
                      <h3 className="font-display text-sm font-semibold tracking-wider">YOUR AI STORE MANAGER</h3>
                      <p className="text-xs text-muted-foreground">Ask me anything about your store, or tell me what to do.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-4">
                      {SUGGESTED_PROMPTS.map((prompt) => (
                        <button
                          key={prompt.label}
                          onClick={() => sendMessage(prompt.text)}
                          className="flex flex-col items-start gap-1.5 p-3 rounded-lg border border-border bg-card/50 hover:bg-card text-left transition-colors"
                        >
                          <prompt.icon className="w-4 h-4 text-accent" />
                          <span className="text-xs font-medium">{prompt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <div key={i}>
                    {/* Pending action confirmation card */}
                    {msg.pending_action && (
                      <ActionConfirmCard
                        action={msg.pending_action}
                        onConfirm={(confirmed) => handleConfirmAction(msg.pending_action!, confirmed)}
                      />
                    )}

                    {/* Regular message */}
                    {msg.content && (
                      <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm ${
                            msg.role === 'user'
                              ? 'bg-accent text-accent-foreground'
                              : 'bg-card border border-border'
                          }`}
                        >
                          {msg.role === 'assistant' ? (
                            <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_pre]:text-xs">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p>{msg.content}</p>
                          )}

                          {/* Tool call badges */}
                          {msg.tool_calls && msg.tool_calls.length > 0 && !msg.pending_action && (
                            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border/50">
                              {msg.tool_calls.map((tc, j) => (
                                <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-mono">
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

              {/* Input */}
              <div className="border-t border-sidebar-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask your AI store manager..."
                    rows={1}
                    className="flex-1 resize-none bg-card border border-border rounded-lg px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent min-h-[40px] max-h-[120px]"
                    style={{ height: 'auto', overflowY: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 120) + 'px';
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || isLoading}
                    className="h-10 w-10 rounded-lg bg-accent text-accent-foreground hover:bg-accent/90 flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Confirmation card for destructive/write actions
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
    description = Object.entries(changes)
      .map(([k, v]) => `${k}: ${current[k]} → ${v}`)
      .join('\n');
  } else if (actionType === 'create_product') {
    const product = action.product as Record<string, unknown>;
    title = `Create "${product.title}"`;
    description = `Price: $${product.price}\nStatus: ${product.status}`;
  } else if (actionType === 'update_inventory') {
    title = `Update Inventory: "${action.variant_title}"`;
    description = `${action.current_count} → ${action.new_count} units`;
  }

  return (
    <div className="bg-card border-2 border-accent/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 text-accent">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-display tracking-wider font-semibold">{title}</span>
      </div>
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">{description}</pre>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onConfirm(true)}
          className="gap-1.5 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          <Check className="w-3.5 h-3.5" />
          Confirm
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onConfirm(false)}
          className="gap-1.5 text-muted-foreground"
        >
          <XCircle className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
