import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This is the admin client. It MUST ONLY be used on the server side (API Routes)
// It bypasses RLS, so be careful and always check permissions manually if needed.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
