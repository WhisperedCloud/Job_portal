
export type UserRole = 'candidate' | 'recruiter' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Candidate {
  user_id: string;
  name: string;
  phone?: string;
  location?: string;
  education?: string;
  experience?: string;
  skills: string[];
  resume_url?: string;
}

export interface Recruiter {
  user_id: string;
  company_name: string;
  industry?: string;
  description?: string;
  location?: string;
  logo_url?: string;
}

export interface Job {
  id: string;
  recruiter_id: string;
  title: string;
  qualification: string;
  experience_level: 'fresher' | 'experienced';
  notice_period?: string;
  job_description: string;
  skills_required: string[];
  location: string;
  created_at: string;
  recruiter?: Recruiter;
}

export interface Application {
  id: string;
  job_id: string;
  candidate_id: string;
  status: 'applied' | 'under_review' | 'rejected' | 'hired';
  applied_at: string;
  job?: Job;
  candidate?: Candidate;
}
