import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

test(
  "service role can read approved_content (staging smoke)",
  { skip: !url || !serviceKey },
  async () => {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await supabase
      .from("approved_content")
      .select("id")
      .limit(1);

    if (error) {
      throw new Error(`approved_content select failed: ${error.message}`);
    }
    if (!Array.isArray(data)) {
      throw new Error("expected array response");
    }
  }
);

test(
  "service role can read submissions (staging smoke)",
  { skip: !url || !serviceKey },
  async () => {
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { error } = await supabase.from("submissions").select("id").limit(1);
    if (error) {
      throw new Error(`submissions select failed: ${error.message}`);
    }
  }
);

test(
  "anon key without session cannot read arbitrary submissions (RLS smoke)",
  { skip: !url || !process.env.SUPABASE_ANON_KEY },
  async () => {
    const supabase = createClient(url, process.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data, error } = await supabase.from("submissions").select("id").limit(5);
    if (error) {
      throw new Error(error.message);
    }
    if (data && data.length > 0) {
      throw new Error(
        "expected no rows for unauthenticated anon on submissions; got rows (check RLS or use empty DB)"
      );
    }
  }
);
