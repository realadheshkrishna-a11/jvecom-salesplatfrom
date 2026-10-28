const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qkwxsiezhyarpcfnbjja.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3hzaWV6aHlhcnBjZm5iamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NTE2NjcsImV4cCI6MjEwODEyNzY2N30.BZiI_00l9WhA80IFTs0ovIxW5VZI3DhUGkpWIYGMzOc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing Supabase queries with anon key...');

  const orgRes = await supabase.from('organizations').select('*');
  console.log('Organizations:', orgRes.data?.length, 'error:', orgRes.error?.message);

  const prodRes = await supabase.from('products').select('*');
  console.log('Products:', prodRes.data?.length, 'error:', prodRes.error?.message);

  const leadRes = await supabase.from('leads').select('*, customer:customers(*)');
  console.log('Leads:', leadRes.data?.length, 'error:', leadRes.error?.message);

  const emailRes = await supabase.from('email_threads').select('*');
  console.log('Email Threads:', emailRes.data?.length, 'error:', emailRes.error?.message);
}

test().catch(console.error);
