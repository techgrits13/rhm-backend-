import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'defined' : 'undefined');
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

console.log('✅ Supabase Client Initialized');
console.log('🔗 URL:', supabaseUrl);
console.log('🔑 Key Length:', supabaseServiceKey.length);
console.log('🔑 Key Start:', supabaseServiceKey.substring(0, 10) + '...');
console.log('🔑 Key End:', '...' + supabaseServiceKey.substring(supabaseServiceKey.length - 10));

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export default supabase;
