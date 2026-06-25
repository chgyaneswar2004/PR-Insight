import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAppStore } from '../../store';
import { MessageSquare, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

export function AIChatWindow({ prId }: { prId: string }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { chatMessages, isChatTyping, sendChatMessage } = useAppStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendChatMessage(prId, input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="flex flex-col h-full border-border bg-bg-card/50 shadow-2xl overflow-hidden">
      <CardHeader className="py-3 px-4 border-b border-border bg-bg-elevated/50 flex flex-row items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent-purple/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent-purple" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">AI Assistant</CardTitle>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Claude 3.5 Sonnet</p>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
          {chatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
              <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">No messages yet.</p>
              <p className="text-xs mt-1">Ask me about the PR, request code explanations, or suggest alternative fixes.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "")}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex shrink-0 items-center justify-center",
                    msg.role === 'user' ? "bg-bg-elevated text-muted-foreground" : "bg-accent-purple/20 text-accent-purple"
                  )}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  </div>
                  <div className={cn(
                    "px-4 py-2 rounded-2xl max-w-[85%] text-sm",
                    msg.role === 'user' 
                      ? "bg-accent-cyan/10 text-white border border-accent-cyan/20 rounded-tr-sm" 
                      : "bg-bg-elevated text-white/90 border border-border rounded-tl-sm"
                  )}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-[10px] opacity-50 mt-1 flex justify-end">
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {isChatTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-purple/20 text-accent-purple flex shrink-0 items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl bg-bg-elevated border border-border rounded-tl-sm flex items-center gap-1 text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-3 bg-bg-elevated/30 border-t border-border mt-auto">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the AI about this PR..."
              className="w-full bg-bg-secondary border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan resize-none h-[52px] min-h-[52px] overflow-hidden"
              rows={1}
            />
            <Button
              size="icon"
              className="absolute right-1.5 top-1.5 h-10 w-10 bg-accent-cyan hover:bg-accent-cyan/90 text-bg-primary rounded-lg"
              disabled={!input.trim() || isChatTyping}
              onClick={handleSend}
            >
              {isChatTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
