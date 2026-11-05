const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://qkwxsiezhyarpcfnbjja.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3hzaWV6aHlhcnBjZm5iamphIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1NTE2NjcsImV4cCI6MjEwODEyNzY2N30.BZiI_00l9WhA80IFTs0ovIxW5VZI3DhUGkpWIYGMzOc';

async function run() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });

  const res = await supabase.auth.signInWithPassword({
    email: 'realadheshkrishna@gmail.com',
    password: 'Adhesh@2004'
  });

  console.log('Admin login result:', {
    user: res.data?.user?.email,
    session: !!res.data?.session,
    error: res.error
  });
}

run().catch(console.error);

