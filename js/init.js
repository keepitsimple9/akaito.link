import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env.js';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabaseClient;
