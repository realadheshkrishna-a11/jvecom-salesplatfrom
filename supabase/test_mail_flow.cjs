const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkwxsiezhyarpcfnbjja.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3hzaWV6aHlhcnBjZm5iamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NTE2NjcsImV4cCI6MjEwODEyNzY2N30.BZiI_00l9WhA80IFTs0ovIxW5VZI3DhUGkpWIYGMzOc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const orgId = '11111111-1111-1111-1111-111111111111';

async function testMailFlow() {
  console.log('Testing live Supabase email operations...');

  // 1. Create a sent thread
  const threadId = 'a1b2c3d4-e5f6-4a1b-8c2d-3e4f5a6b7c8d';
  const msgId = 'f1e2d3c4-b5a6-4f1e-8d2c-3b4a5f6e7d8c';

  const threadRes = await supabase.from('email_threads').upsert({
    id: threadId,
    organization_id: orgId,
    subject: 'Production Verification — JVECOM Wholesale Sourcing',
    participants: ['admin@jvecom.in', 'buyer@kadalundiretail.in'],
    last_message_at: new Date().toISOString(),
    unread_count: 0,
    folder: 'sent',
    is_draft: false,
  }).select();

  console.log('Thread insert:', threadRes.error ? threadRes.error.message : 'SUCCESS (ID: ' + threadRes.data[0]?.id + ')');

  // 2. Insert message
  const msgRes = await supabase.from('email_messages').insert({
    id: msgId,
    thread_id: threadId,
    organization_id: orgId,
    from_address: 'admin@jvecom.in',
    from_name: 'Adhesh Krishna',
    to_addresses: ['buyer@kadalundiretail.in'],
    subject: 'Production Verification — JVECOM Wholesale Sourcing',
    body_html: '<p>Verified production outbound delivery message.</p>',
    body_text: 'Verified production outbound delivery message.',
    status: 'sent',
    delivery_status: 'gateway_pending',
    is_read: true,
  }).select();

  console.log('Message insert:', msgRes.error ? msgRes.error.message : 'SUCCESS (ID: ' + msgRes.data[0]?.id + ')');

  // 3. Query Sent folder
  const sentRes = await supabase
    .from('email_threads')
    .select('*')
    .eq('organization_id', orgId)
    .eq('folder', 'sent');

  console.log('Total sent threads visible in Supabase:', sentRes.data?.length);
  sentRes.data?.forEach(t => console.log('  • ' + t.subject));
}

testMailFlow().catch(console.error);
