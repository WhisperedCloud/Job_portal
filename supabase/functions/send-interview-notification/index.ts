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

    console.log('Action received:', action, 'for user:', userId);

    let result;

    switch (action) {
      case 'reset_password':
        // Get user's email first
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError || !userData?.user?.email) {
          throw new Error('User not found or email not available');
        }

        console.log('Sending password reset email to:', userData.user.email);

        // Send password reset email
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(
          userData.user.email,
          {
            redirectTo: `https://yzppfbsoarvaodfncpjh.supabase.co/reset-password`,
          }
        );

        if (resetError) {
          console.error('Reset error:', resetError);
          throw resetError;
        }

        result = { success: true, message: 'Password reset email sent' };
        break;

      case 'ban_user':
        console.log('Banning user with duration:', data.duration);

        // Calculate ban end date
        const now = new Date();
        let banUntil: Date;

        switch (data.duration) {
          case '1day':
            banUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            break;
          case '1week':
            banUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case '1month':
            banUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
          case 'permanent':
            banUntil = new Date(now.getTime() + 100 * 365 * 24 * 60 * 60 * 1000);
            break;
          default:
            throw new Error('Invalid ban duration');
        }

        console.log('Ban until:', banUntil.toISOString());

        // Use the admin API to ban the user - different approach
        // First, get the current user data
        const { data: currentUserData, error: getUserError } = await supabase.auth.admin.getUserById(userId);
        
        if (getUserError) {
          throw getUserError;
        }

        // Update user with app_metadata to track ban
        const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...currentUserData.user.app_metadata,
            banned: true,
            banned_until: banUntil.toISOString(),
            banned_at: now.toISOString(),
          },
        });

        if (updateError) {
          console.error('Ban error:', updateError);
          throw updateError;
        }

        console.log('User banned successfully');
        result = { success: true, data: updateData };
        break;

      case 'unban_user':
        console.log('Unbanning user:', userId);
        
        // Get current user data
        const { data: bannedUserData, error: getBannedUserError } = await supabase.auth.admin.getUserById(userId);
        
        if (getBannedUserError) {
          throw getBannedUserError;
        }

        // Remove ban from app_metadata
        const { data: unbanData, error: unbanError } = await supabase.auth.admin.updateUserById(userId, {
          app_metadata: {
            ...bannedUserData.user.app_metadata,
            banned: false,
            banned_until: null,
            unbanned_at: new Date().toISOString(),
          },
        });

        if (unbanError) {
          console.error('Unban error:', unbanError);
          throw unbanError;
        }

        console.log('User unbanned successfully');
        result = { success: true, data: unbanData };
        break;

      case 'change_role':
        // Get current user data
        const { data: currentUserRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .single();

        const oldRole = currentUserRoles?.role;
        const newRole = data.newRole;

        console.log('Changing role from', oldRole, 'to', newRole);

        // Update user_roles table
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: newRole, updated_at: new Date().toISOString() })
          .eq('user_id', userId);

        if (roleError) {
          console.error('Role update error:', roleError);
          throw roleError;
        }

        // Update user metadata
        result = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { role: newRole },
        });

        if (result.error) {
          console.error('Metadata update error:', result.error);
          throw result.error;
        }

        // Get the user's name from the appropriate table
        let userName = 'User';
        if (oldRole === 'candidate') {
          const { data: candidateData } = await supabase
            .from('candidates')
            .select('name')
            .eq('user_id', userId)
            .single();
          userName = candidateData?.name || 'User';
        } else if (oldRole === 'recruiter') {
          const { data: recruiterData } = await supabase
            .from('recruiters')
            .select('company_name, name')
            .eq('user_id', userId)
            .single();
          userName = recruiterData?.name || recruiterData?.company_name || 'User';
        }

        console.log('Preserved user name:', userName);

        // Handle role change - create profile in new role table if needed
        if (newRole === 'recruiter' && oldRole === 'candidate') {
          const { data: candidateData } = await supabase
            .from('candidates')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (candidateData) {
            const { data: existingRecruiter } = await supabase
              .from('recruiters')
              .select('id')
              .eq('user_id', userId)
              .single();

            if (!existingRecruiter) {
              await supabase
                .from('recruiters')
                .insert({
                  user_id: userId,
                  company_name: candidateData.name,
                  name: candidateData.name,
                });
              console.log('Created recruiter profile');
            }
          }
        } else if (newRole === 'candidate' && oldRole === 'recruiter') {
          const { data: recruiterData } = await supabase
            .from('recruiters')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (recruiterData) {
            const { data: existingCandidate } = await supabase
              .from('candidates')
              .select('id')
              .eq('user_id', userId)
              .single();

            if (!existingCandidate) {
              await supabase
                .from('candidates')
                .insert({
                  user_id: userId,
                  name: recruiterData.name || recruiterData.company_name || 'User',
                  skills: [],
                });
              console.log('Created candidate profile');
            }
          }
        }

        // Create notification for user (optional, won't fail if table doesn't exist)
        try {
          await supabase
            .from('notifications')
            .insert({
              user_id: userId,
              type: 'role_changed',
              title: '🎭 Your Role Has Been Updated',
              message: `Your account role has been changed from ${oldRole} to ${newRole}.\n\nYou may need to log out and log back in to see the changes.`,
            });
          console.log('Notification created');
        } catch (notifError) {
          console.error('Notification error (non-critical):', notifError);
        }
        break;

      case 'delete_user':
        console.log('Deleting user:', userId);
        
        // Delete from user_roles
        await supabase.from('user_roles').delete().eq('user_id', userId);
        
        // Delete from candidates
        await supabase.from('candidates').delete().eq('user_id', userId);
        
        // Delete from recruiters
        await supabase.from('recruiters').delete().eq('user_id', userId);
        
        // Delete user from auth
        result = await supabase.auth.admin.deleteUser(userId);
        
        if (result.error) {
          console.error('Delete error:', result.error);
          throw result.error;
        }
        
        console.log('User deleted successfully');
        break;

      default:
        throw new Error('Invalid action');
    }

    if (result?.error) {
      throw result.error;
    }

    return new Response(
      JSON.stringify({ success: true, data: result?.data || result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error in admin action:", err);
    return new Response(
      JSON.stringify({ error: err.message || 'Action failed' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});