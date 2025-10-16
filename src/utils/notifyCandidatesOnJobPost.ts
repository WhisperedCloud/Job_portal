export async function notifyCandidatesOnJobPost(supabase: any, job: any) {
    // Find candidates whose skills overlap with job.skills_required
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('id, user_id, skills')
      .overlaps('skills', job.skills_required);
  
    if (candidatesError) {
      console.error('Error fetching candidates:', candidatesError);
      return;
    }
  
    for (const candidate of candidates) {
      // Find user_roles.id for candidate
      const { data: userRole, error: userRoleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', candidate.user_id)
        .single();
  
      if (!userRole || userRoleError) continue;
  
      await supabase
        .from('notifications')
        .insert([{
          user_id: userRole.id,
          type: 'job_alert',
          data: {
            job_id: job.id,
            job_title: job.title,
            company: job.company_name,
            location: job.location,
          },
          is_read: false,
        }]);
    }
  }