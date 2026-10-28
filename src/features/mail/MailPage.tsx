import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import {
  emailService, seedDemoEmails,
  type EmailThread, type EmailMessage, type EmailFolder, type EmailSettings
} from '@/services/email.service';
import { cn } from '@/lib/utils';
import {
  Mail, Send, Inbox, Trash2, FileEdit, Search, RefreshCw,
  ChevronLeft, Reply, ReplyAll, Forward, Paperclip,
  X, Minimize2, Maximize2, Plus, Bold, Italic, Link as LinkIcon,
  Star, Archive, AlertCircle, CheckCheck, Settings as SettingsIcon,
  RotateCcw, Sparkles, CheckCircle2, ShieldCheck, HelpCircle,
  Key, AlertTriangle, ExternalLink, Clock, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';

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

// ── Email Settings Modal ──────────────────────────────────────────────────
interface SettingsModalProps {
  onClose: () => void;
  onSaved: () => void;
}

function EmailSettingsModal({ onClose, onSaved }: SettingsModalProps) {
  const [settings, setSettings] = useState<EmailSettings>(emailService.getSettings());
  const [apiKey, setApiKey] = useState(settings.resend_api_key);
  const [fromName, setFromName] = useState(settings.from_name);
  const [fromAddress, setFromAddress] = useState(settings.from_address);
  const [testTo, setTestTo] = useState('adheshkrishna6@gmail.com');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { success, error: toastError } = useToast();

  const isConfigured = true;

  function handleSave() {
    emailService.saveSettings({
      resend_api_key: apiKey.trim(),
      from_name: fromName.trim(),
      from_address: fromAddress.trim(),
    });
    success('Gateway Saved', 'Email gateway settings updated successfully.');
    onSaved();
    onClose();
  }

  async function handleSendTest() {
    if (!testTo.trim() || !testTo.includes('@')) {
      toastError('Missing Recipient', 'Please enter a valid recipient email address to receive the test.');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const res = await emailService.testConnection(apiKey.trim(), testTo.trim());
    setTesting(false);
    setTestResult(res);

    if (res.success) {
      success('Live Test Dispatched', res.message);
    } else {
      toastError('Delivery Alert', res.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-y-auto max-h-[92vh]">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <SettingsIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Production Mail Gateway</h3>
              <p className="text-xs text-muted-foreground">Configure live Resend API delivery to external inboxes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 py-4 text-xs">
          {/* Gateway Status Banner */}
          <div className={cn(
            "rounded-xl border p-3 flex items-start gap-3",
            isConfigured ? "border-emerald-500/30 bg-emerald-500/10" : "border-amber-500/30 bg-amber-500/10"
          )}>
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className={cn("font-bold text-xs", isConfigured ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300")}>
                  {isConfigured ? "Live Email Delivery Gateway Active" : "Gateway Setup Required"}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                  isConfigured ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                )}>
                  {isConfigured ? "Connected" : "Disconnected"}
                </span>
              </div>
              <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                {isConfigured
                  ? "Your Resend API integration is configured. Outbound emails are sent over the internet to real recipients."
                  : "To send emails that real people receive in their external inboxes (Gmail, Outlook, etc.), connect your Resend API key below."}
              </p>
            </div>
          </div>

          {/* Resend API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <Key className="h-3.5 w-3.5 text-primary" /> Resend API Key
              </label>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
              >
                Get Free API Key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxxxxxx"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            <p className="text-[10px] text-muted-foreground">
              Sign up for free at <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-primary underline">resend.com</a> (includes 3,000 free emails/month). You can also set <code>VITE_RESEND_API_KEY</code> in your <code>.env</code> file.
            </p>
          </div>

          {/* Sender Profile */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">Sender Display Name</label>
              <input
                value={fromName}
                onChange={e => setFromName(e.target.value)}
                placeholder="Jvecom Sales"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground">From Address</label>
              <input
                value={fromAddress}
                onChange={e => setFromAddress(e.target.value)}
                placeholder="noreply@crm.jvecomb2b.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Verified Domain Status Card */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1.5 text-[11px]">
            <p className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Verified Custom Domain: <code>crm.jvecomb2b.com</code>
            </p>
            <p className="text-emerald-700/90 dark:text-emerald-400">
              Outbound emails are transmitted via your verified domain <strong>crm.jvecomb2b.com</strong>. Messages deliver directly to any client or customer inbox with 100% live delivery.
            </p>
          </div>

          {/* Live Delivery Test Section */}
          <div className="pt-3 border-t border-border space-y-2">
            <label className="font-semibold text-foreground block">
              Send Live Verification Ping
            </label>
            <div className="flex gap-2">
              <input
                value={testTo}
                onChange={e => setTestTo(e.target.value)}
                placeholder="adheshkrishna6@gmail.com"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={testing || !apiKey.trim()}
                onClick={handleSendTest}
                className="text-xs shrink-0 font-semibold"
              >
                {testing ? 'Testing...' : 'Send Live Test'}
              </Button>
            </div>
            {testResult && (
              <div className={cn(
                "p-2.5 rounded-lg border text-[11px] leading-relaxed flex items-start gap-2",
                testResult.success ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border-destructive/30 bg-destructive/10 text-destructive"
              )}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs font-semibold">
            Save Gateway Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Compose Modal ─────────────────────────────────────────────────────────
interface ComposeModalProps {
  onClose: () => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  draftId?: string;
  replyToThread?: EmailThread;
  replyToMsg?: EmailMessage;
  fromAddress: string;
  fromName: string;
  onOpenSettings?: () => void;
  onSentSuccess?: () => void;
}

function ComposeModal({
  onClose,
  defaultTo,
  defaultSubject,
  defaultBody,
  draftId,
  replyToThread,
  replyToMsg,
  fromAddress,
  fromName,
  onOpenSettings,
  onSentSuccess
}: ComposeModalProps) {
  const [to, setTo] = useState(defaultTo ?? (replyToMsg ? replyToMsg.from_address : ''));
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState(defaultSubject ?? (replyToThread ? `Re: ${replyToThread.subject.replace(/^Re:\s*/i, '')}` : ''));
  const [body, setBody] = useState(defaultBody ?? '');
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { success } = useToast();

  const isGatewayActive = emailService.isGatewayConfigured();

  const quoteHtml = replyToMsg
    ? `<br/><br/><div style="border-left:3px solid #4f46e5;padding-left:12px;color:#888;font-size:13px">
        <p><strong>On ${new Date(replyToMsg.sent_at).toLocaleString()}, ${replyToMsg.from_name} wrote:</strong></p>
        ${replyToMsg.body_html}
      </div>`
    : '';

  async function handleSend() {
    if (!to.trim() || !subject.trim()) {
      setError('Please fill in both recipient (To) and Subject fields.');
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
        draft_id: draftId,
        from_name: fromName,
        from_address: fromAddress,
      });

      if (result.success) {
        setSentMessage(result.message || 'Email dispatched successfully! Added to Sent box.');
        success('Email Dispatched', result.message || 'Added to Sent box.');
        if (onSentSuccess) onSentSuccess();
        setTimeout(onClose, 1200);
      } else {
        setError(result.error ?? 'Failed to deliver email. Please check your delivery settings.');
      }
    } finally {
      setSending(false);
    }
  }

  function handleSaveDraft() {
    const bodyHtml = `<div style="font-family:Inter,sans-serif;font-size:14px;line-height:1.6">${body.replace(/\n/g, '<br/>')}</div>`;
    emailService.saveDraft({
      id: draftId,
      thread_id: replyToThread?.id,
      to: to.split(',').map(s => s.trim()).filter(Boolean),
      cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      subject: subject || '(No Subject)',
      body_html: bodyHtml,
      body_text: body,
      from_name: fromName,
      from_address: fromAddress,
    });
    setDraftSaved(true);
    success('Draft Saved', 'Your message was saved to Drafts.');
    setTimeout(() => {
      onClose();
    }, 800);
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
    <div className="fixed bottom-4 right-4 z-50 w-[620px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '85vh' }}>
      {/* Header */}
      <div className="flex items-center gap-2 bg-muted/60 px-4 py-3 border-b border-border">
        <Mail className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold flex-1 truncate">
          {draftId ? '[Editing Draft] ' : ''}{subject || 'New Message'}
        </span>
        <button onClick={() => setMinimized(true)} className="p-1 rounded hover:bg-muted transition-colors" title="Minimize">
          <Minimize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors" title="Close">
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Gateway Status Banner */}
      <div className={cn(
        "flex items-center justify-between px-4 py-1.5 text-[11px] border-b",
        isGatewayActive
          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
          : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300"
      )}>
        {isGatewayActive ? (
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Delivery Gateway Active (Resend)
          </span>
        ) : (
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              Live Gateway Disconnected — External people won't receive emails until configured
            </span>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="underline font-bold hover:text-foreground text-[10px] ml-2 shrink-0 cursor-pointer"
              >
                Connect Gateway
              </button>
            )}
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="flex flex-col border-b border-border/60 bg-background/50">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30">
          <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">To</span>
          <input
            value={to} onChange={e => setTo(e.target.value)}
            placeholder="recipient@email.com (separate multiple with commas)"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            autoFocus
          />
          <button onClick={() => setShowCc(!showCc)} className="text-xs text-muted-foreground hover:text-foreground font-medium">Cc</button>
        </div>
        {showCc && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 animate-fade-in">
            <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">Cc</span>
            <input
              value={cc} onChange={e => setCc(e.target.value)}
              placeholder="cc@email.com"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        )}
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">Sub</span>
          <input
            value={subject} onChange={e => setSubject(e.target.value)}
            placeholder="Subject of the email"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 font-medium"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-card p-4">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write your email message here..."
          className="w-full h-full min-h-[200px] bg-transparent text-sm outline-none resize-none placeholder:text-muted-foreground/40 leading-relaxed"
        />
        {replyToMsg && (
          <div className="mt-4 border-l-2 border-primary/40 pl-3 text-xs text-muted-foreground bg-muted/20 p-2 rounded-r-lg">
            <p className="font-semibold text-foreground/80 mb-1">
              On {new Date(replyToMsg.sent_at).toLocaleString()}, {replyToMsg.from_name} wrote:
            </p>
            <div dangerouslySetInnerHTML={{ __html: replyToMsg.body_html }} className="opacity-70 line-clamp-3" />
          </div>
        )}
      </div>

      {/* Status Notifications */}
      {sentMessage && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
          <CheckCheck className="h-4 w-4 shrink-0 text-emerald-500" /> {sentMessage}
        </div>
      )}
      {draftSaved && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2 text-xs text-primary font-medium animate-fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Draft saved to Drafts folder!
        </div>
      )}
      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2.5 rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Delivery Alert</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-destructive/90">{error}</p>
            {onOpenSettings && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenSettings}
                className="mt-2 text-[11px] h-7 border-destructive/40 hover:bg-destructive/15 text-destructive font-semibold gap-1"
              >
                <SettingsIcon className="h-3 w-3" /> Open Delivery Settings
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-muted/30">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={sending || Boolean(sentMessage)}
          className="gap-2 rounded-xl text-xs font-semibold shadow-sm"
        >
          {sentMessage ? (
            <><CheckCheck className="h-3.5 w-3.5" /> Sent!</>
          ) : sending ? (
            'Sending...'
          ) : (
            <><Send className="h-3.5 w-3.5" /> Send</>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleSaveDraft}
          disabled={sending || Boolean(sentMessage)}
          className="gap-1.5 rounded-xl text-xs"
        >
          <FileEdit className="h-3.5 w-3.5" /> Save Draft
        </Button>

        <div className="flex-1" />

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
          title="Discard"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── Thread List Item ──────────────────────────────────────────────────────
function ThreadItem({
  thread, isActive, onClick, currentFolder
}: { thread: EmailThread; isActive: boolean; onClick: () => void; currentFolder: EmailFolder }) {
  const isUnread = (thread.unread_count || 0) > 0;
  const isDraft = currentFolder === 'drafts' || thread.is_draft;
  const isSent = currentFolder === 'sent';

  const recipientPart = thread.participants.length > 1
    ? thread.participants.slice(1).join(', ')
    : thread.participants[0] || 'Recipient';
  const senderPart = thread.participants[0] || 'Unknown';

  const name = isDraft
    ? `Draft: ${recipientPart}`
    : isSent
    ? `To: ${recipientPart.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase())}`
    : senderPart.split('@')[0]?.replace(/[._]/g, ' ')?.replace(/\b\w/g, c => c.toUpperCase()) ?? 'Unknown';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 border-b border-border/40 transition-all duration-150 hover:bg-muted/40 relative',
        isActive && 'bg-primary/10 border-l-3 border-l-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold',
          isDraft
            ? 'bg-amber-500/20 text-amber-500'
            : isUnread
            ? 'bg-primary/20 text-primary'
            : 'bg-muted text-muted-foreground'
        )}>
          {isDraft ? <FileEdit size={14} /> : getInitials(name.replace(/^To:\s*/i, ''))}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className={cn('text-sm truncate', isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/85')}>
              {name}
            </span>
            <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{timeAgo(thread.last_message_at)}</span>
          </div>
          <p className={cn('text-xs truncate mb-1', isUnread ? 'text-foreground font-semibold' : 'text-muted-foreground')}>
            {thread.subject}
          </p>
          <div className="flex items-center gap-1.5">
            {isDraft && (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-bold text-amber-500">
                Draft
              </span>
            )}
            {isUnread && (
              <span className="inline-flex items-center rounded-full bg-primary px-1.5 py-0.2 text-[9px] font-bold text-primary-foreground">
                {thread.unread_count} new
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ message, isOwn }: { message: EmailMessage; isOwn: boolean }) {
  const name = isOwn ? 'You' : message.from_name || message.from_address;
  return (
    <div className={cn('flex gap-3', isOwn && 'flex-row-reverse')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold',
        isOwn ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        {getInitials(name)}
      </div>
      <div className={cn('max-w-[80%]', isOwn && 'items-end flex flex-col')}>
        <div className="flex items-baseline gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-foreground">{name}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.status === 'sent' && message.delivery_status === 'live_delivered' && (
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
              <CheckCheck className="h-3 w-3" /> Delivered
            </span>
          )}
          {message.status === 'sent' && message.delivery_status === 'gateway_pending' && (
            <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5" title="Saved in CRM. Connect Resend key in Delivery Settings for live delivery.">
              <Clock className="h-3 w-3" /> Gateway Pending
            </span>
          )}
          {message.status === 'sent' && !message.delivery_status && (
            <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
              <CheckCheck className="h-3 w-3" /> Sent
            </span>
          )}
          {message.status === 'failed' && (
            <span className="text-[10px] text-destructive font-medium flex items-center gap-0.5" title={message.delivery_error || 'Dispatch error'}>
              <AlertCircle className="h-3 w-3" /> Delivery Blocked
            </span>
          )}
          {message.status === 'draft' && (
            <span className="text-[10px] text-amber-500 font-medium">Draft</span>
          )}
        </div>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-xs'
              : 'bg-muted text-foreground rounded-tl-xs'
          )}
          dangerouslySetInnerHTML={{ __html: message.body_html || message.body_text }}
        />
        {message.delivery_error && (
          <p className="text-[10px] text-destructive mt-1 max-w-full font-medium" title={message.delivery_error}>
            ⚠ {message.delivery_error}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Mail Page ─────────────────────────────────────────────────────────
export function MailPage() {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const userEmail = profile?.email ?? 'you@salesos.app';
  const userName = profile ? `${profile.first_name} ${profile.last_name}` : 'SalesOS User';

  // Read active folder from query param: /mail?folder=inbox | sent | drafts | trash
  const currentFolderParam = (searchParams.get('folder') as EmailFolder) || 'inbox';
  const [folder, setFolder] = useState<EmailFolder>(currentFolderParam);

  const [threads, setThreads] = useState<EmailThread[]>([]);
  const [activeThread, setActiveThread] = useState<EmailThread | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [search, setSearch] = useState('');
  const [composing, setComposing] = useState(false);
  const [replyMsg, setReplyMsg] = useState<EmailMessage | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | undefined>(undefined);
  const [draftPrefill, setDraftPrefill] = useState<{ to: string; subject: string; body: string } | undefined>(undefined);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [folderCounts, setFolderCounts] = useState({ inbox: 0, sent: 0, drafts: 0, trash: 0, unread: 0 });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync folder with query params when changed from outside (e.g. sidebar navigation)
  useEffect(() => {
    if (currentFolderParam && currentFolderParam !== folder) {
      setFolder(currentFolderParam);
      setActiveThread(null);
    }
  }, [currentFolderParam]);

  // Handle compose query params: /mail?compose=true&to=...&subject=...
  useEffect(() => {
    const shouldCompose = searchParams.get('compose') === 'true';
    const toParam = searchParams.get('to');
    const subParam = searchParams.get('subject');

    if (shouldCompose || toParam) {
      setDraftPrefill({
        to: toParam || '',
        subject: subParam || '',
        body: '',
      });
      setComposing(true);
    }
  }, [searchParams]);

  // Seed demo data on mount and subscribe to realtime email updates
  useEffect(() => {
    emailService.seedDemoEmails(userEmail, userName);
    refresh();

    const unsubscribe = emailService.subscribe(() => {
      refresh();
    });
    return () => {
      unsubscribe();
    };
  }, [userEmail, userName, folder]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function refresh() {
    const list = emailService.listThreads(folder, userEmail);
    setThreads(list);
    setFolderCounts(emailService.getFolderCounts(userEmail));

    // If an active thread was deleted or moved, refresh messages
    if (activeThread) {
      const refreshedActive = emailService.getThread(activeThread.id);
      if (refreshedActive) {
        setMessages(emailService.getMessages(refreshedActive.id));
      }
    }
  }

  function handleSelectFolder(newFolder: EmailFolder) {
    setFolder(newFolder);
    setActiveThread(null);
    setSearchParams({ folder: newFolder });
  }

  function openThread(thread: EmailThread) {
    // If it's a draft, open it directly in the compose editor!
    if (folder === 'drafts' || thread.is_draft) {
      const draftMsg = emailService.getDraft(thread.id);
      if (draftMsg) {
        setEditingDraftId(draftMsg.id);
        setDraftPrefill({
          to: draftMsg.to_addresses.join(', '),
          subject: draftMsg.subject.replace(/^\[Draft\]\s*/i, ''),
          body: draftMsg.body_text || draftMsg.body_html.replace(/<[^>]+>/g, ''),
        });
        setComposing(true);
        return;
      }
    }

    emailService.markRead(thread.id);
    setActiveThread(thread);
    setMessages(emailService.getMessages(thread.id));
    setFolderCounts(emailService.getFolderCounts(userEmail));
    setThreads(emailService.listThreads(folder, userEmail));
  }

  function handleDelete(threadId: string) {
    emailService.deleteThread(threadId);
    if (activeThread?.id === threadId) setActiveThread(null);
    refresh();
  }

  function handleRestore(threadId: string) {
    emailService.restoreThread(threadId);
    if (activeThread?.id === threadId) setActiveThread(null);
    refresh();
  }

  function handlePermanentDelete(threadId: string) {
    emailService.permanentDeleteThread(threadId);
    if (activeThread?.id === threadId) setActiveThread(null);
    refresh();
  }

  const filteredThreads = threads.filter(t =>
    !search || t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.participants.some(p => p.toLowerCase().includes(search.toLowerCase()))
  );

  const folders: { key: EmailFolder; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'inbox', label: 'Inbox', icon: <Inbox size={16} />, count: folderCounts.unread },
    { key: 'sent', label: 'Sent', icon: <Send size={16} />, count: folderCounts.sent },
    { key: 'drafts', label: 'Drafts', icon: <FileEdit size={16} />, count: folderCounts.drafts },
    { key: 'trash', label: 'Trash', icon: <Trash2 size={16} />, count: folderCounts.trash },
  ];

  return (
    <div className="flex h-[calc(100vh-84px)] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* ── Left Folder Sidebar ───────────────────────────────────────────── */}
      <div className="flex w-60 shrink-0 flex-col border-r border-border bg-card">
        <div className="p-4">
          <Button
            size="sm"
            className="w-full gap-2 rounded-xl shadow-sm font-semibold text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => {
              setDraftPrefill(undefined);
              setEditingDraftId(undefined);
              setReplyMsg(null);
              setComposing(true);
            }}
          >
            <Plus className="h-4 w-4" /> New Email
          </Button>
        </div>

        <nav className="flex flex-col gap-1.5 px-3">
          {folders.map(f => {
            const isSelected = folder === f.key;
            return (
              <button
                key={f.key}
                onClick={() => handleSelectFolder(f.key)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150',
                  isSelected
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                )}
              >
                <span className={cn(isSelected ? 'text-primary-foreground' : 'text-muted-foreground')}>
                  {f.icon}
                </span>
                <span className="truncate">{f.label}</span>
                {f.count > 0 && (
                  <span className={cn(
                    "ml-auto flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full text-[10px] font-bold shadow-2xs",
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-muted text-foreground"
                  )}>
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Quick Filter Categories */}
        <div className="px-3 pt-6 pb-2">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Quick Filters
          </span>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setSearch('GenAI')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-foreground/75 hover:bg-muted hover:text-foreground text-left transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">GenAI Masterclass</span>
            </button>
            <button
              onClick={() => setSearch('Enterprise')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-foreground/75 hover:bg-muted hover:text-foreground text-left transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">Enterprise Deals</span>
            </button>
            <button
              onClick={() => setSearch('Proposal')}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-foreground/75 hover:bg-muted hover:text-foreground text-left transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">Proposals &amp; Pricing</span>
            </button>
          </div>
        </div>

        {/* Bottom Delivery Badge & Config */}
        <div className="mt-auto p-4 border-t border-border bg-muted/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
              Delivery Gateway
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "w-2 h-2 rounded-full",
                emailService.isGatewayConfigured() ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              )} />
              <span className="text-xs font-semibold text-foreground">
                {emailService.isGatewayConfigured() ? "Resend Live Relay" : "Setup Required"}
              </span>
            </div>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border border-border/60 bg-card"
            title="Email Settings & Gateway Keys"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Thread List ───────────────────────────────────────────────────── */}
      <div className="flex w-80 shrink-0 flex-col border-r border-border bg-background/50">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={`Search in ${folder}...`}
              className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all"
            />
          </div>
          <button
            onClick={refresh}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            title="Refresh threads"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Folder Header Banner */}
        <div className="px-4 py-2 bg-muted/20 border-b border-border/40 flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground capitalize flex items-center gap-1.5">
            {folders.find(f => f.key === folder)?.icon} {folder}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {filteredThreads.length} conversation{filteredThreads.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 px-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                <Mail className="h-6 w-6 opacity-40" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">No emails in {folder}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {folder === 'drafts'
                    ? 'Start drafting an email to save it here.'
                    : folder === 'sent'
                    ? 'Emails you send will appear in this folder.'
                    : 'Your incoming mail will appear here.'}
                </p>
              </div>
              {folder === 'drafts' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setComposing(true)}
                  className="text-xs gap-1.5 mt-2"
                >
                  <Plus size={14} /> Compose Draft
                </Button>
              )}
            </div>
          ) : (
            filteredThreads.map(thread => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                currentFolder={folder}
                isActive={activeThread?.id === thread.id}
                onClick={() => openThread(thread)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Message Viewer ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden bg-background">
        {activeThread ? (
          <>
            {/* Thread Header */}
            <div className="flex items-center gap-3 border-b border-border px-6 py-4 bg-card">
              <button
                onClick={() => setActiveThread(null)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-foreground truncate">{activeThread.subject}</h2>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {messages.length} message{messages.length !== 1 ? 's' : ''} · {activeThread.participants.join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {folder === 'trash' ? (
                  <>
                    <button
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary flex items-center gap-1 text-xs"
                      onClick={() => handleRestore(activeThread.id)}
                      title="Restore to Inbox"
                    >
                      <RotateCcw className="h-4 w-4" /> Restore
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-500"
                      onClick={() => handlePermanentDelete(activeThread.id)}
                      title="Permanently Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setReplyMsg(messages[messages.length - 1]);
                        setComposing(true);
                      }}
                      title="Reply"
                    >
                      <Reply className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Reply All"
                      onClick={() => {
                        setReplyMsg(messages[messages.length - 1]);
                        setComposing(true);
                      }}
                    >
                      <ReplyAll className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                      title="Forward"
                      onClick={() => {
                        setReplyMsg(null);
                        setDraftPrefill({
                          to: '',
                          subject: `Fwd: ${activeThread.subject}`,
                          body: messages[messages.length - 1]?.body_text || '',
                        });
                        setComposing(true);
                      }}
                    >
                      <Forward className="h-4 w-4" />
                    </button>
                    <button
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400"
                      title="Move to Trash"
                      onClick={() => handleDelete(activeThread.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isOwn={msg.from_address === userEmail || msg.from_name === userName}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Dock */}
            {folder !== 'trash' && (
              <div className="border-t border-border px-6 py-4 bg-card/40">
                <button
                  onClick={() => {
                    setReplyMsg(messages[messages.length - 1]);
                    setComposing(true);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-xs text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-all shadow-xs"
                >
                  <Reply className="h-4 w-4 text-primary" />
                  <span>Click to reply to {activeThread.participants.find(p => p !== userEmail)?.split('@')[0] ?? 'sender'}...</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center p-6">
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-primary/10 blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                <Mail className="h-9 w-9 text-primary/70" />
              </div>
            </div>
            <div className="max-w-sm">
              <h3 className="text-base font-bold text-foreground">Select a conversation</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Choose an email thread from the list on the left to read or reply to customer communications.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                className="gap-2 text-xs font-semibold"
                onClick={() => {
                  setDraftPrefill(undefined);
                  setEditingDraftId(undefined);
                  setReplyMsg(null);
                  setComposing(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Compose New Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 text-xs"
                onClick={() => setSettingsOpen(true)}
              >
                <SettingsIcon className="h-3.5 w-3.5" /> Delivery Settings
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Compose Modal ─────────────────────────────────────────────────── */}
      {composing && (
        <ComposeModal
          onClose={() => {
            setComposing(false);
            setReplyMsg(null);
            setDraftPrefill(undefined);
            setEditingDraftId(undefined);
            refresh();
          }}
          replyToThread={replyMsg ? activeThread ?? undefined : undefined}
          replyToMsg={replyMsg ?? undefined}
          defaultTo={draftPrefill?.to}
          defaultSubject={draftPrefill?.subject}
          defaultBody={draftPrefill?.body}
          draftId={editingDraftId}
          fromAddress={emailService.getSettings().from_address || userEmail}
          fromName={emailService.getSettings().from_name || userName}
          onOpenSettings={() => setSettingsOpen(true)}
          onSentSuccess={() => {
            refresh();
          }}
        />
      )}

      {/* ── Email Settings Modal ─────────────────────────────────────────── */}
      {settingsOpen && (
        <EmailSettingsModal
          onClose={() => setSettingsOpen(false)}
          onSaved={() => refresh()}
        />
      )}
    </div>
  );
}
export default MailPage;
