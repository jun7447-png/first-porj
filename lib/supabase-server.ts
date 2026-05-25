import { createClient } from "@supabase/supabase-js";

// 서버 API 라우트에서만 사용. 클라이언트 컴포넌트에서 절대 import 금지.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
