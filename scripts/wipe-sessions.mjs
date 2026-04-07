import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Environment Variables Missing (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipe() {
    console.log("🚀 Starting Global Session Recalibration...");
    const { error } = await supabase
        .from('capital_accounts')
        .update({ encrypted_session_tokens: null })
        .not('id', 'is', null); // Apply to all records

    if (error) {
        console.error("❌ Wipe failed:", error.message);
    } else {
        console.log("✅ All brokerage sessions cleared. The system will now perform fresh, verified handshakes.");
    }
}

wipe();
