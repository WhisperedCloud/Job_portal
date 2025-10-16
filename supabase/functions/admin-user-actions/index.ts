import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { action, userId, data } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    let result;

    switch (action) {
      case 'reset_password':
        result = await supabase.auth.admin.updateUserById(userId, {
          password: data.temporaryPassword || 'TempPass123!',
        });
        break;

      case 'ban_user':
        // Validate adminId
        if (!data.adminId) throw new Error('Missing adminId for ban action');
        if (!data.duration) throw new Error('Missing duration for ban action');

        const banUntil = new Date();
        // Accept both backend and frontend duration formats
        switch (data.duration) {
          case '1day':
          case '1 day':
            banUntil.setDate(banUntil.getDate() + 1);
            break;
          case '7days':
          case '1week':
          case '7 days':
          case '1 week':
            banUntil.setDate(banUntil.getDate() + 7);
            break;
          case '30days':
          case '1month':
          case '30 days':
          case '1 month':
            banUntil.setMonth(banUntil.getMonth() + 1);
            break;
          case 'permanent':
            banUntil.setFullYear(banUntil.getFullYear() + 100);
            break;
          default:
            throw new Error('Invalid ban duration');
        }
        result = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { banned: true, ban_duration: banUntil.toISOString() },
        });
        // Upsert ban record
        const upsertResult = await supabase.from('user_bans').upsert({
          user_id: userId,
          banned_by: data.adminId,
          banned_at: new Date().toISOString(),
          banned_until: banUntil.toISOString(),
          is_active: true,
          reason: `Banned for ${data.duration}`,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
        if (upsertResult.error) throw upsertResult.error;
        break;

      case 'unban_user':
        result = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { banned: false, ban_duration: null },
        });
        const updateResult = await supabase.from('user_bans').update({
          is_active: false,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId).eq('is_active', true);
        if (updateResult.error) throw updateResult.error;
        break;

      case 'change_role':
        if (!data.newRole) throw new Error('Missing newRole for change_role action');
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: data.newRole, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        if (roleError) throw roleError;
        result = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: data.newRole },
        });
        break;

      case 'delete_user':
        await supabase.from('user_roles').delete().eq('user_id', userId);
        await supabase.from('candidates').delete().eq('user_id', userId);
        await supabase.from('recruiters').delete().eq('user_id', userId);
        await supabase.from('user_bans').delete().eq('user_id', userId);
        result = await supabase.auth.admin.deleteUser(userId);
        break;

      default:
        throw new Error('Invalid action');
    }

    if (result?.error) throw result.error;

    return new Response(
      JSON.stringify({ success: true, data: result?.data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});