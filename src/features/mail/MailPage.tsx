import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import {
  emailService, seedDemoEmails,
  type EmailThread, type EmailMessage, type EmailFolder,
} from '@/services/email.service';
import { cn } from '@/lib/utils';
import {
  Mail, Send, Inbox, Trash2, FileEdit, Search, RefreshCw,
  ChevronLeft, Reply, ReplyAll, Forward, Paperclip,
  X, Minimize2, Maximize2, Plus, Bold, Italic, Link,
  MoreVertical, Star, Archive, AlertCircle, CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ── Helpers ───────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Compose Modal ─────────────────────────────────────────────────────────
interface ComposeModalProps {
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  replyToThread?: EmailThread;
  replyToMsg?: EmailMessage;
  fromAddress: string;
  fromName: string;
}

function ComposeModal({ onClose, defaultTo, defaultSubject, replyToThread, replyToMsg, fromAddress, fromName }: ComposeModalProps) {
  const [to, setTo] = useState(defaultTo ?? (replyToMsg ? replyToMsg.from_address : ''));
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject ?? (replyToThread ? `Re: ${replyToThread.subject}` : ''));
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quoteHtml = replyToMsg
    ? `<br/><br/><div style="border-left:3px solid #4f46e5;padding-left:12px;color:#888;font-size:13px">
        <p><strong>On ${new Date(replyToMsg.sent_at).toLocaleString()}, ${replyToMsg.from_name} wrote:</strong></p>
        ${replyToMsg.body_html}
      </div>`
    : '';

  async function handleSend() {
    if (!to.trim() || !subject.trim()) {
      setError('Please fill in To and Subject fields.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const bodyHtml = `<div style="font-family:Inter,sans-serif;font-size:14px;line-height:1.6">${body.replace(/\n/g, '<br/>')}${quoteHtml}</div>`;
      const result = await emailService.send({
        to: to.split(',').map(s => s.trim()).filter(Boolean),
        cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        subject,
        body_html: bodyHtml,
        body_text: body,
        thread_id: replyToThread?.id,
        from_name: fromName,
        from_address: fromAddress,
      });
      if (result.success) {
        setSent(true);
        setTimeout(onClose, 1200);
      } else {
        setError(result.error ?? 'Failed to send email.');
      }
    } finally {
      setSending(false);
    }
  }

  if (minimized) {
    return (
      <div
        className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-2xl cursor-pointer"
        onClick={() => setMinimized(false)}
      >
        <FileEdit className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium truncate max-w-[180px]">{subject || 'New Message'}</span>
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground ml-2" />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[580px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
      {/* Header */}
      <div className="flex items-center gap-2 bg-card/80 backdrop-blur px-4 py-3 border-b border-border">
        <Mail className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold flex-1">{subject || 'New Message'}</span>
        <button onClick={() => setMinimized(true)} className="p-1 rounded hover:bg-muted transition-colors">
          <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex flex-col border-b border-border/60">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
          <span className="text-xs text-muted-foreground w-7 shrink-0">To</span>
          <input
            value={to} onChange={e => setTo(e.target.value)}
            placeholder="recipient@email.com"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <button onClick={() => setShowCc(!showCc)} className="text-xs text-muted-foreground hover:text-foreground">Cc</button>
        </div>
        {showCc && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
            <span className="text-xs text-muted-foreground w-7 shrink-0">Cc</span>
            <input
              value={cc} onChange={e => setCc(e.target.value)}
              placeholder="cc@email.com"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-xs text-muted-foreground w-7 shrink-0">Sub</span>
          <input
            value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 font-medium"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your message here..."
          className="w-full h-full min-h-[180px] bg-transparent px-4 py-3 text-sm outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed"
        />
        {replyToMsg && (
          <div className="mx-4 mb-3 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">On {new Date(replyToMsg.sent_at).toLocaleString()}, {replyToMsg.from_name} wrote:</p>
            <div dangerouslySetInnerHTML={{ __html: replyToMsg.body_html }} className="opacity-60 line-clamp-3" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/60">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || sent}
          className="gap-2 rounded-xl text-xs"
        >
          {sent ? <><CheckCheck className="h-3.5 w-3.5" /> Sent!</> : sending ? 'Sending...' : <><Send className="h-3.5 w-3.5" /> Send</>}
        </Button>
        <div className="flex-1" />
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Link className="h-3.5 w-3.5" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
        </button>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Thread List Item ──────────────────────────────────────────────────────
function ThreadItem({
  thread, isActive, onClick,
}: { thread: EmailThread; isActive: boolean; onClick: () => void }) {
  const isUnread = thread.unread_count > 0;
  const otherParticipant = thread.participants.find(p => p !== '') ?? thread.participants[0];
  const name = otherParticipant?.split('@')[0]?.replace(/[._]/g, ' ')
    ?.replace(/\b\w/g, c => c.toUpperCase()) ?? 'Unknown';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 border-b border-border/40 transition-all duration-150 hover:bg-muted/40',
        isActive && 'bg-primary/8 border-l-2 border-l-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isUnread ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
        )}>
          {getInitials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={cn('text-sm truncate', isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80')}>
              {name}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo(thread.last_message_at)}</span>
          </div>
          <p className={cn('text-xs truncate mb-0.5', isUnread ? 'text-foreground font-medium' : 'text-muted-foreground')}>
            {thread.subject}
          </p>
          {isUnread && (
            <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground">
              {thread.unread_count} new
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ message, isOwn }: { message: EmailMessage; isOwn: boolean }) {
  const name = isOwn ? 'You' : message.from_name;
  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        isOwn ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        {getInitials(name)}
      </div>
      <div className={cn('max-w-[75%]', isOwn && 'items-end flex flex-col')}>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">{name}</span>
          <span className="text-[10px] text-muted-foreground">{new Date(message.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
          dangerouslySetInnerHTML={{ __html: message.body_html }}
        />
      </div>
    </div>
  );
}

// ── Main Mail Page ─────────────────────────────────────────────────────────
export function MailPage() {
  const { profile } = useAuth();
  const userEmail = profile?.email ?? 'you@salesos.app';
  const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'SalesOS User';

  const [folder, setFolder] = useState<EmailFolder>('inbox');
  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [activeThread, setActiveThread] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [search, setSearch] = useState('');
  const [composing, setComposing] = useState(false);
  const [replyMsg, setReplyMsg] = useState<EmailMessage | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Seed demo data and load threads
  useEffect(() => {
    seedDemoEmails(userEmail, userName);
    refresh();
  }, []);

  useEffect(() => {
    refresh();
  }, [folder]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function refresh() {
    setThreads(emailService.listThreads(folder));
    setTotalUnread(emailService.totalUnread());
  }

  function openThread(thread: EmailThread) {
    emailService.markRead(thread.id);
    setActiveThread(thread);
    setMessages(emailService.getMessages(thread.id));
    setTotalUnread(emailService.totalUnread());
    setThreads(emailService.listThreads(folder));
  }

  function handleDelete(threadId: string) {
    emailService.deleteThread(threadId);
    if (activeThread?.id === threadId) setActiveThread(null);
    refresh();
  }

  const filteredThreads = threads.filter(t =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.participants.some(p => p.toLowerCase().includes(search.toLowerCase()))
  );

  const folders: { key: EmailFolder; label: string; icon: React.ReactNode }[] = [
    { key: 'inbox', label: 'Inbox', icon: <Inbox size={16} /> },
    { key: 'sent', label: 'Sent', icon: <Send size={16} /> },
    { key: 'drafts', label: 'Drafts', icon: <FileEdit size={16} /> },
    { key: 'trash', label: 'Trash', icon: <Trash2 size={16} /> },
  ];

  return (
    <div className="flex h-[calc(100vh-72px)] overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <div className="flex w-52 shrink-0 flex-col border-r border-border bg-sidebar/60">
        <div className="p-4">
          <Button
            size="sm"
            className="w-full gap-2 rounded-xl shadow-md"
            onClick={() => { setComposing(true); setReplyMsg(null); }}
          >
            <Plus className="h-4 w-4" /> Compose
          </Button>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {folders.map(f => (
            <button
              key={f.key}
              onClick={() => { setFolder(f.key); setActiveThread(null); }}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                folder === f.key
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {f.icon}
              {f.label}
              {f.key === 'inbox' && totalUnread > 0 && (
                <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalUnread}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 text-[10px] text-muted-foreground/60 leading-relaxed">
          <p>Powered by</p>
          <p className="font-semibold text-muted-foreground">Resend</p>
        </div>
      </div>

      {/* ── Thread List ───────────────────────────────────────────── */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search emails..."
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <Mail className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No emails here</p>
            </div>
          ) : (
            filteredThreads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isActive={activeThread?.id === thread.id}
                onClick={() => openThread(thread)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Message Viewer ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeThread ? (
          <>
            {/* Thread header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4">
              <button
                onClick={() => setActiveThread(null)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex-1">
                <h2 className="text-base font-bold text-foreground">{activeThread.subject}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {messages.length} message{messages.length !== 1 ? 's' : ''} · {activeThread.participants.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  onClick={() => { setReplyMsg(messages[messages.length - 1]); setComposing(true); }}
                  title="Reply"
                >
                  <Reply className="h-4 w-4" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  title="Reply All"
                >
                  <ReplyAll className="h-4 w-4" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                  title="Forward"
                  onClick={() => { setReplyMsg(null); setComposing(true); }}
                >
                  <Forward className="h-4 w-4" />
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                  title="Delete"
                  onClick={() => handleDelete(activeThread.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.from_address === userEmail}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick reply bar */}
            <div className="border-t border-border px-6 py-4">
              <button
                onClick={() => { setReplyMsg(messages[messages.length - 1]); setComposing(true); }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Reply className="h-4 w-4" />
                Click to reply to {activeThread.participants.find(p => p !== userEmail)?.split('@')[0] ?? 'sender'}...
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-primary/5 blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-muted">
                <Mail className="h-9 w-9 text-muted-foreground/50" />
              </div>
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Select a conversation</h3>
              <p className="text-sm text-muted-foreground mt-1">Choose a thread from the list to read messages</p>
            </div>
            <Button size="sm" variant="outline" className="gap-2 mt-1" onClick={() => setComposing(true)}>
              <Plus className="h-3.5 w-3.5" /> Compose new email
            </Button>
          </div>
        )}
      </div>

      {/* ── Compose Modal ─────────────────────────────────────────── */}
      {composing && (
        <ComposeModal
          onClose={() => { setComposing(false); setReplyMsg(null); refresh(); }}
          replyToThread={replyMsg ? activeThread ?? undefined : undefined}
          replyToMsg={replyMsg ?? undefined}
          fromAddress={userEmail}
          fromName={userName}
        />
      )}
    </div>
  );
}
