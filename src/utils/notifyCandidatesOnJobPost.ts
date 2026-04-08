export async function notifyCandidatesOnJobPost(supabase: any, job: any) {
  if (!job?.skills_required?.length) return;

  // Find candidates whose skills overlap with job.skills_required
  const { data: candidates, error: candidatesError } = await supabase
    .from('candidates')
    .select('id, user_id, skills')
    .overlaps('skills', job.skills_required);

  if (candidatesError) {
    console.error('Error fetching candidates for notification:', candidatesError);
    return;
  }
  if (!candidates || candidates.length === 0) return;

  for (const candidate of candidates) {
    // Get the user_roles.id for this candidate (notifications FK references user_roles.id)
    const { data: userRole, error: userRoleError } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', candidate.user_id)
      .maybeSingle();

    if (!userRole || userRoleError) {
      console.warn(`No user_role found for candidate user_id: ${candidate.user_id}`);
      continue;
    }

    const { error: insertError } = await supabase
      .from('notifications')
      .insert([{
        user_id: userRole.id,   // FK to user_roles.id
        type: 'job_alert',
        data: {
          job_id: job.id,
          job_title: job.title,
          company: job.company_name,
          location: job.location,
          skills_required: job.skills_required,
        },
        is_read: false,
      }]);

    if (insertError) {
      console.error(`❌ Failed to insert notification for user_role ${userRole.id}:`, insertError);
    } else {
      console.log(`✅ Notification successfully inserted for candidate ${candidate.id}`);
    }
  }

  console.log(`🏁 Notification process complete. Processed ${candidates.length} matching candidate(s).`);
}

/**
 * Notify a single recruiter when a candidate applies to their job.
 */
export async function notifyRecruiterOnApplication(supabase: any, {
  recruiterId,   // recruiters.id
  candidateName,
  jobTitle,
  applicationId,
}: {
  recruiterId: string;
  candidateName: string;
  jobTitle: string;
  applicationId: string;
}) {
  // Get recruiter user_id, then resolve user_roles.id
  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('user_id')
    .eq('id', recruiterId)
    .maybeSingle();

  if (!recruiter?.user_id) return;

  const { data: userRole } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', recruiter.user_id)
    .maybeSingle();

  if (!userRole?.id) return;

  await supabase.from('notifications').insert([{
    user_id: userRole.id,
    type: 'application_received',
    data: {
      candidate_name: candidateName,
      job_title: jobTitle,
      application_id: applicationId,
      message: `${candidateName} applied for ${jobTitle}`,
    },
    is_read: false,
  }]);
}

/**
 * Notify a candidate about an application status update.
 */
export async function notifyCandidateOnStatusChange(supabase: any, {
  candidateUserId,
  jobTitle,
  newStatus,
}: {
  candidateUserId: string;
  jobTitle: string;
  newStatus: string;
}) {
  const { data: userRole } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', candidateUserId)
    .maybeSingle();

  if (!userRole?.id) return;

  const statusLabels: Record<string, string> = {
    under_review: 'is under review',
    interview_scheduled: 'has an interview scheduled',
    hired: 'resulted in a hire! Congratulations!',
    rejected: 'was not selected this time',
  };

  await supabase.from('notifications').insert([{
    user_id: userRole.id,
    type: 'application_update',
    data: {
      job_title: jobTitle,
      status: newStatus,
      message: `Your application for "${jobTitle}" ${statusLabels[newStatus] || newStatus}`,
    },
    is_read: false,
  }]);
}