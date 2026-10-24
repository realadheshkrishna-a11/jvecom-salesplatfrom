// =============================================================================
// SalesOS — Email Service
// Stores email threads + messages in localStorage (demo/offline).
// Actual sending is delegated to a Supabase Edge Function → Resend API.
// =============================================================================

export type EmailFolder = 'inbox' | 'sent' | 'drafts' | 'trash';
export type EmailStatus = 'sent' | 'draft' | 'failed';

export interface EmailThread {
  id: string;
  subject: string;
  participants: string[];      // all to/from addresses involved
  last_message_at: string;
  unread_count: number;
  folder: EmailFolder;
  customer_id?: string;
  lead_id?: string;
  created_at: string;
}

export interface EmailMessage {
  id: string;
  thread_id: string;
  from_address: string;
  from_name: string;
  to_addresses: string[];
  cc_addresses: string[];
  subject: string;
  body_html: string;
  body_text: string;
  status: EmailStatus;
  is_read: boolean;
  sent_at: string;
  resend_id?: string;
  customer_id?: string;
  lead_id?: string;
}

export interface ComposePayload {
  to: string[];
  cc?: string[];
  subject: string;
  body_html: string;
  body_text: string;
  thread_id?: string;           // when replying
  customer_id?: string;
  lead_id?: string;
  from_name: string;
  from_address: string;
  resend_api_key?: string;      // optional: pass from env
}

const THREADS_KEY = 'salesos_email_threads';
const MESSAGES_KEY = 'salesos_email_messages';

function getThreads(): EmailThread[] {
  try { return JSON.parse(localStorage.getItem(THREADS_KEY) || '[]'); }
  catch { return []; }
}
function saveThreads(t: EmailThread[]) {
  localStorage.setItem(THREADS_KEY, JSON.stringify(t));
}
function getMessages(): EmailMessage[] {
  try { return JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]'); }
  catch { return []; }
}
function saveMessages(m: EmailMessage[]) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(m));
}

function uuid() {
  return crypto.randomUUID();
}

// ---------------------------------------------------------------------------
// Seed demo data (runs once)
// ---------------------------------------------------------------------------
export function seedDemoEmails(userEmail: string, userName: string) {
  if (getThreads().length > 0) return;

  const now = new Date();
  const threads: EmailThread[] = [
    {
      id: 'thread-1', subject: 'Follow-up on your recent purchase', unread_count: 1,
      participants: [userEmail, 'rohan.sharma@techcorp.in'],
      last_message_at: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
      folder: 'inbox', customer_id: undefined, created_at: new Date(now.getTime() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: 'thread-2', subject: 'Invoice INV-2026-0041 — Payment Confirmation', unread_count: 0,
      participants: [userEmail, 'priya.nair@innovate.io'],
      last_message_at: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      folder: 'sent', created_at: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
    },
    {
      id: 'thread-3', subject: 'Product Demo Request — GenAI Masterclass', unread_count: 2,
      participants: [userEmail, 'ajay.verma@startup.co'],
      last_message_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      folder: 'inbox', created_at: new Date(now.getTime() - 1000 * 60 * 60 * 25).toISOString(),
    },
  ];

  const messages: EmailMessage[] = [
    {
      id: 'msg-1a', thread_id: 'thread-1',
      from_address: 'rohan.sharma@techcorp.in', from_name: 'Rohan Sharma',
      to_addresses: [userEmail], cc_addresses: [], subject: 'Follow-up on your recent purchase',
      body_html: '<p>Hi,</p><p>I wanted to follow up on my recent purchase of the GenAI Masterclass. Could you share the access details? Looking forward to getting started!</p><p>Best,<br/>Rohan</p>',
      body_text: 'Hi, I wanted to follow up on my recent purchase. Could you share the access details?',
      status: 'sent', is_read: false,
      sent_at: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'msg-2a', thread_id: 'thread-2',
      from_address: userEmail, from_name: userName,
      to_addresses: ['priya.nair@innovate.io'], cc_addresses: [], subject: 'Invoice INV-2026-0041 — Payment Confirmation',
      body_html: '<p>Dear Priya,</p><p>Thank you for your payment. Please find attached your invoice <strong>INV-2026-0041</strong> for ₹65,000.</p><p>Regards,<br/>' + userName + '</p>',
      body_text: 'Dear Priya, Thank you for your payment. Invoice INV-2026-0041 for ₹65,000.',
      status: 'sent', is_read: true,
      sent_at: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: 'msg-3a', thread_id: 'thread-3',
      from_address: 'ajay.verma@startup.co', from_name: 'Ajay Verma',
      to_addresses: [userEmail], cc_addresses: [], subject: 'Product Demo Request — GenAI Masterclass',
      body_html: '<p>Hello,</p><p>We are a startup of 25 engineers and are very interested in the GenAI Masterclass corporate package. Could we schedule a 30-min demo?</p><p>Thanks,<br/>Ajay</p>',
      body_text: 'Hello, We are interested in a demo for the GenAI Masterclass corporate package.',
      status: 'sent', is_read: false,
      sent_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: 'msg-3b', thread_id: 'thread-3',
      from_address: userEmail, from_name: userName,
      to_addresses: ['ajay.verma@startup.co'], cc_addresses: [], subject: 'Re: Product Demo Request — GenAI Masterclass',
      body_html: '<p>Hi Ajay,</p><p>Happy to arrange a demo! Let\'s connect tomorrow at 3 PM IST. Please confirm.</p><p>Best,<br/>' + userName + '</p>',
      body_text: 'Hi Ajay, Happy to arrange a demo! Let\'s connect tomorrow at 3 PM IST.',
      status: 'sent', is_read: true,
      sent_at: new Date(now.getTime() - 1000 * 60 * 60 * 23).toISOString(),
    },
  ];

  saveThreads(threads);
  saveMessages(messages);
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
export const emailService = {
  listThreads(folder?: EmailFolder): EmailThread[] {
    const threads = getThreads();
    if (!folder) return threads.sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
    return threads
      .filter(t => t.folder === folder)
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  },

  getThread(id: string): EmailThread | undefined {
    return getThreads().find(t => t.id === id);
  },

  getMessages(threadId: string): EmailMessage[] {
    return getMessages()
      .filter(m => m.thread_id === threadId)
      .sort((a, b) => a.sent_at.localeCompare(b.sent_at));
  },

  markRead(threadId: string) {
    const messages = getMessages().map(m =>
      m.thread_id === threadId ? { ...m, is_read: true } : m
    );
    saveMessages(messages);
    const threads = getThreads().map(t =>
      t.id === threadId ? { ...t, unread_count: 0 } : t
    );
    saveThreads(threads);
  },

  deleteThread(id: string) {
    saveThreads(getThreads().map(t => t.id === id ? { ...t, folder: 'trash' as EmailFolder } : t));
  },

  totalUnread(): number {
    return getThreads()
      .filter(t => t.folder === 'inbox')
      .reduce((sum, t) => sum + t.unread_count, 0);
  },

  /** Send email — calls Supabase Edge Function which calls Resend */
  async send(payload: ComposePayload): Promise<{ success: boolean; error?: string; resendId?: string }> {
    const now = new Date().toISOString();
    const msgId = uuid();
    const threadId = payload.thread_id || uuid();

    // Optimistically store in local state
    const message: EmailMessage = {
      id: msgId,
      thread_id: threadId,
      from_address: payload.from_address,
      from_name: payload.from_name,
      to_addresses: payload.to,
      cc_addresses: payload.cc ?? [],
      subject: payload.subject,
      body_html: payload.body_html,
      body_text: payload.body_text,
      status: 'sent',
      is_read: true,
      sent_at: now,
      customer_id: payload.customer_id,
      lead_id: payload.lead_id,
    };

    const messages = getMessages();
    messages.push(message);
    saveMessages(messages);

    const threads = getThreads();
    const existingThread = threads.find(t => t.id === threadId);
    if (existingThread) {
      const updated = threads.map(t =>
        t.id === threadId ? { ...t, last_message_at: now } : t
      );
      saveThreads(updated);
    } else {
      const newThread: EmailThread = {
        id: threadId,
        subject: payload.subject,
        participants: [payload.from_address, ...payload.to],
        last_message_at: now,
        unread_count: 0,
        folder: 'sent',
        customer_id: payload.customer_id,
        lead_id: payload.lead_id,
        created_at: now,
      };
      saveThreads([...threads, newThread]);
    }

    // Try to actually send via Supabase Edge Function
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        // Demo mode — just succeed locally
        return { success: true };
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          to: payload.to,
          cc: payload.cc,
          subject: payload.subject,
          html: payload.body_html,
          text: payload.body_text,
          from_name: payload.from_name,
          from_address: payload.from_address,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send email' };
      }
      // Update with Resend ID
      const updated = getMessages().map(m =>
        m.id === msgId ? { ...m, resend_id: data.id } : m
      );
      saveMessages(updated);
      return { success: true, resendId: data.id };
    } catch (err) {
      // Network/edge function unavailable — treat as demo success
      return { success: true };
    }
  },
};
