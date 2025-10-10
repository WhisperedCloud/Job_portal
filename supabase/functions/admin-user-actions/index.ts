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
      case 'verify_email':
        result = await supabase.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });
        break;

      case 'reset_password':
        result = await supabase.auth.admin.updateUserById(userId, {
          password: data.temporaryPassword || 'TempPass123!',
        });
        
        // Send email notification
        const { data: userData } = await supabase.auth.admin.getUserById(userId);
        if (userData?.user?.email) {
          await supabase.auth.resetPasswordForEmail(userData.user.email);
        }
        break;

      case 'ban_user':
        const banUntil = new Date();
        switch (data.duration) {
          case '1day':
            banUntil.setDate(banUntil.getDate() + 1);
            break;
          case '1week':
            banUntil.setDate(banUntil.getDate() + 7);
            break;
          case '1month':
            banUntil.setMonth(banUntil.getMonth() + 1);
            break;
          case 'permanent':
            banUntil.setFullYear(banUntil.getFullYear() + 100);
            break;
        }

        result = await supabase.auth.admin.updateUserById(userId, {
          banned: true,
          ban_duration: banUntil.toISOString(),
        });
        break;

      case 'unban_user':
        result = await supabase.auth.admin.updateUserById(userId, {
          banned: false,
          ban_duration: 'none',
        });
        break;

      case 'change_role':
        // Update user_roles table
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: data.newRole, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (roleError) throw roleError;

        // Update user metadata
        result = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: data.newRole },
        });

        // Create notification for user
        const { data: candidate } = await supabase
          .from('candidates')
          .select('name')
          .eq('user_id', userId)
          .single();

        await supabase
          .from('notifications')
          .insert({
            user_id: userId,
            candidate_id: userId,
            type: 'role_changed',
            title: '🎭 Your Role Has Been Updated',
            message: `Your account role has been changed to: ${data.newRole}\n\nYou may need to log out and log back in to see the changes.`,
          });
        break;

      case 'delete_user':
        // Delete from user_roles first
        await supabase.from('user_roles').delete().eq('user_id', userId);
        
        // Delete user
        result = await supabase.auth.admin.deleteUser(userId);
        break;

      default:
        throw new Error('Invalid action');
    }

    if (result?.error) {
      throw result.error;
    }

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