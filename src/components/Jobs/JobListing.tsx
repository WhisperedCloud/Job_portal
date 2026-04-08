import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
  MapPin, Clock, Building, Search, Briefcase, Loader2,
  Star, CheckCircle, XCircle, AlertCircle, Sparkles, FileSearch,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Progress } from '../ui/progress';
import JobApplicationModal from '../Applications/JobApplicationModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─── Circular score ring ─────────────────────────────────────────────────────
const CircularScore = ({
  score,
  loading = false,
}: {
  score: number;
  loading?: boolean;
}) => {
  const circumference = 2 * Math.PI * 24;
  const offset = circumference * (1 - score / 100);

  if (loading) {
    return (
      <div className="relative flex items-center justify-center w-14 h-14">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const getColor = (s: number) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#6366f1';
    if (s >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg width="56" height="56" className="transform -rotate-90">
        <circle cx="28" cy="28" r="24" fill="#f3f4f6" />
        <circle
          cx="28" cy="28" r="24"
          fill="none"
          stroke={getColor(score)}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.3s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color: getColor(score) }}>
        {score}%
      </span>
    </div>
  );
};

const UnanalysedRing = () => (
  <div className="w-14 h-14 rounded-full border-4 border-dashed border-gray-300 flex items-center justify-center">
    <span className="text-[9px] text-gray-400 text-center leading-tight">
      Not<br />analysed
    </span>
  </div>
);

// ─── Job Details Modal ───────────────────────────────────────────────────────
const JobDetailsModal = ({
  job,
  isOpen,
  onClose,
}: {
  job: any;
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const DESCRIPTION_LIMIT = 400;

  if (!isOpen || !job) return null;
  const isLong = job.job_description && job.job_description.length > DESCRIPTION_LIMIT;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl p-0 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 rounded-full p-2 text-gray-600 z-10"
          aria-label="Close"
        >
          &#10005;
        </button>
        <div className="bg-gradient-to-r from-blue-100 to-blue-300 py-6 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-900 mb-2">{job.title}</h2>
            <div className="flex items-center gap-4 text-sm text-blue-700">
              <span className="flex items-center gap-1">
                <Building className="h-4 w-4" />
                {job.recruiter?.company_name || 'Company'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="text-xs" variant="default">{job.experience_level}</Badge>
            <Badge className="text-xs" variant="secondary">
              <Briefcase className="h-3 w-3 mr-1 inline" />
              {job.job_type || 'N/A'}
            </Badge>
          </div>
        </div>
        <div className="p-8" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <div className="mb-6">
            <h3 className="font-semibold mb-1 text-gray-800">Description</h3>
            <p className="text-gray-700">
              {isLong && !showFullDescription
                ? job.job_description.slice(0, DESCRIPTION_LIMIT) + '...'
                : job.job_description || 'N/A'}
            </p>
            {isLong && (
              <button
                className="text-blue-600 underline mt-2"
                onClick={() => setShowFullDescription(!showFullDescription)}
              >
                {showFullDescription ? 'View Less' : 'View More'}
              </button>
            )}
          </div>
          <div className="mb-6">
            <h3 className="font-semibold mb-1 text-gray-800">Skills Required</h3>
            <div className="flex gap-2 flex-wrap">
              {job.skills_required && job.skills_required.length > 0
                ? safeArray(job.skills_required).map((skill: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{skill}</Badge>
                ))
                : <span className="text-muted-foreground">None listed</span>}
            </div>
          </div>
          <div className="mb-6">
            <h3 className="font-semibold mb-1 text-gray-800">Job Poster</h3>
            <div className="pl-2">
              <div><strong>Company:</strong> {job.recruiter?.company_name || 'N/A'}</div>
              <div><strong>Industry:</strong> {job.recruiter?.industry || 'N/A'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Helper: safely get a non-empty string array from various field shapes ───
function safeArray(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch {
      return [value];
    }
  }

  return [];
}

// ─── Main component ──────────────────────────────────────────────────────────
const JobListing = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobScores, setJobScores] = useState<{ [jobId: string]: number }>({});
  const [loadingScores, setLoadingScores] = useState<{ [jobId: string]: boolean }>({});
  const [viewJob, setViewJob] = useState<any>(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const JOBS_PER_PAGE = 5;

  useEffect(() => {
    fetchJobs(0, true);
  }, [searchTerm, locationFilter, experienceFilter]);

  useEffect(() => {
    if (user?.id) loadScoresFromLocalStorage();
    else setJobScores({});
  }, [user?.id]);

  const loadScoresFromLocalStorage = () => {
    if (!user?.id) return;
    try {
      const stored = localStorage.getItem(`jobMatchScores_${user.id}`);
      setJobScores(stored ? JSON.parse(stored) : {});
    } catch {
      setJobScores({});
    }
  };

  const saveScoresToLocalStorage = (newScores: { [jobId: string]: number }) => {
    if (!user?.id) return;
    try {
      localStorage.setItem(`jobMatchScores_${user.id}`, JSON.stringify(newScores));
    } catch { }
  };

  const fetchJobs = async (pageToFetch = 0, isInitial = false) => {
    try {
      if (isInitial) { setLoading(true); setPage(0); }
      else setLoadingMore(true);

      let query = supabase
        .from('jobs')
        .select(`*, recruiter:recruiters (id, company_name, industry)`, { count: 'exact' });

      if (searchTerm) {
        query = query.or(`title.ilike.%${searchTerm}%,job_description.ilike.%${searchTerm}%`);
      }
      if (locationFilter) query = query.ilike('location', `%${locationFilter}%`);
      if (experienceFilter && experienceFilter !== 'all') {
        query = query.eq('experience_level', experienceFilter);
      }

      const from = pageToFetch * JOBS_PER_PAGE;
      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, from + JOBS_PER_PAGE - 1);

      if (error) throw error;

      if (isInitial) setJobs(data || []);
      else setJobs((prev) => [...prev, ...(data || [])]);

      setTotalCount(count || 0);
      setHasMore(count ? from + (data?.length || 0) < count : false);
      setPage(pageToFetch);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) fetchJobs(page + 1);
  };

  const analyseSingleJobScore = async (jobId: string) => {
    let candidateId = user?.candidate_id;
    if (!candidateId && user?.role === 'candidate') {
      const { data: candData } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (candData?.id) candidateId = candData.id;
    }

    if (!candidateId) {
      toast.error('Candidate profile not found. Please visit My Profile to set up your details first.');
      return;
    }

    const { data: candidateCheck, error: checkError } = await supabase
      .from('candidates')
      .select('id, name, skills, experience, seniority_level, resume_text, linkedin_summary, projects')
      .eq('id', candidateId)
      .single();

    if (checkError || !candidateCheck) {
      toast.error('Could not verify your profile details. Please try again.');
      return;
    }

    const hasSkills = Array.isArray(candidateCheck?.skills) && candidateCheck.skills.length > 0;
    if (!hasSkills) {
      toast.warning(
        'Your profile has no skills saved. Please go to My Profile → Skills and save your skills first for accurate AI analysis.',
        { duration: 8000 }
      );
      return;
    }

    setLoadingScores((prev) => ({ ...prev, [jobId]: true }));

    try {
      const functionName = 'job-match-score';
      console.log(`🧠 [AI] Invoking ${functionName}...`);

      const { data, error } = await supabase.functions.invoke(functionName, {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: {
          candidateId,
          jobId,
          candidateSkills: candidateCheck.skills,
          candidateExperience: candidateCheck.experience,
          candidateResume: candidateCheck.resume_text,
          candidateLinkedIn: candidateCheck.linkedin_summary,
          candidateProjects: candidateCheck.projects,
        },
      });

      if (error) throw error;

      // ✅ FIX 3: Normalise response — handle both old and new edge function response shapes
      const score = typeof data.score === 'number' ? data.score : 0;

      // Support old response shape (analysis/gaps) and new shape (summary/growthAreas)
      const summary =
        data.summary ||
        data.analysis ||
        "AI analysis complete. Review the breakdown below for detailed insights.";

      const strengths = safeArray(data.strengths).length
        ? safeArray(data.strengths)
        : [
          "Relevant technical foundation detected",
          "Candidate shows alignment with role requirements"
        ];

      const growthAreas = safeArray(data.growthAreas || data.gaps).length
        ? safeArray(data.growthAreas || data.gaps)
        : [
          "Needs deeper exposure to required technologies",
          "Could improve domain-specific experience"
        ];

      const hiddenStrengths = safeArray(data.hiddenStrengths).length
        ? safeArray(data.hiddenStrengths)
        : [
          "Adaptability across different technologies",
          "Strong potential for learning new skills quickly"
        ];

      const riskFactors = safeArray(data.riskFactors).length
        ? safeArray(data.riskFactors)
        : [
          "Some required skills may need ramp-up time",
          "Experience alignment should be validated during interview"
        ];
      console.log("FULL API RESPONSE:", data);
      const domainBreakdown = Array.isArray(data.domainBreakdown) ? data.domainBreakdown : [];

      const newScores = { ...jobScores, [jobId]: score };
      setJobScores(newScores);
      saveScoresToLocalStorage(newScores);
      console.log("AI RESPONSE:", data);
      setSelectedAnalysis({
        score,
        summary,
        strengths,
        growthAreas,
        hiddenStrengths,
        riskFactors,
        domainBreakdown,
        isRealAI: data.isRealAI,
        jobTitle: jobs.find((j) => String(j.id) === String(jobId))?.title,
      });
      setIsAnalysisModalOpen(true);
      toast.success('AI Analysis Complete!');
    } catch (error: any) {
      console.error('Error fetching job match score:', error);
      console.group('Failing Edge Function Diagnostics');
      console.error('Error Message:', error.message);
      console.error('Error Object:', error);
      if (error.context) console.error('Full Context:', error.context);
      console.groupEnd();
      toast.error(`Failed to calculate score: ${error.message}`);
    } finally {
      setLoadingScores((prev) => ({ ...prev, [jobId]: false }));
    }
  };

  const handleApplyNow = (job: any) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleViewJobDetails = (job: any) => {
    setViewJob(job);
    setIsJobModalOpen(true);
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Browse Jobs</h1>
        <p className="text-muted-foreground mt-2">Find your next opportunity</p>
        {user?.candidate_id && (
          <p className="text-sm text-muted-foreground mt-4">
            Click "Analyse Score" on any job to get your AI-powered match report.
          </p>
        )}
      </div>

      {/* Search & Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search by job title or skills"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Input
              placeholder="Location"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
            <Select value={experienceFilter} onValueChange={setExperienceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Experience Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="fresher">Fresher</SelectItem>
                <SelectItem value="experienced">Experienced</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => fetchJobs(0, true)}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Job list */}
      <div className="space-y-4">
        {totalCount > 0 && (
          <div className="text-sm text-muted-foreground">{totalCount} jobs found</div>
        )}

        {jobs.length === 0 && !loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                {totalCount === 0
                  ? 'No jobs have been posted yet.'
                  : 'No jobs found. Try adjusting your filters.'}
              </p>
              <Button onClick={() => fetchJobs(0, true)} variant="outline">
                Refresh Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {jobs.map((job) => {
              const hasScore = jobScores[job.id] !== undefined;
              const isLoadingThis = !!loadingScores[job.id];

              return (
                <Card
                  key={job.id}
                  className={`hover:shadow-md transition-shadow ${hasScore ? 'border-primary border-2 shadow-lg' : ''
                    }`}
                >
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold">{job.title}</h3>
                          {user?.candidate_id && hasScore && (
                            <div className="flex items-center gap-2 text-primary animate-pulse">
                              <Star className="h-5 w-5 fill-current" />
                              <span className="font-bold">Score Analysed!</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4" />
                            {job.recruiter?.company_name || 'Company'}
                          </div>
                          {job.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(job.created_at).toLocaleDateString()}
                          </div>
                          {job.job_type && (
                            <div className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              {job.job_type}
                            </div>
                          )}
                        </div>
                        {job.job_description && (
                          <p className="text-muted-foreground mb-3">
                            {job.job_description.substring(0, 150)}...
                          </p>
                        )}
                        {job.skills_required && job.skills_required.length > 0 && (
                          <div className="flex gap-2 mb-3 flex-wrap">
                            {job.skills_required.map((skill: string, index: number) => (
                              <Badge key={index} variant="secondary">{skill}</Badge>
                            ))}
                          </div>
                        )}
                        {job.experience_level && (
                          <Badge
                            variant={job.experience_level === 'fresher' ? 'default' : 'outline'}
                          >
                            {job.experience_level}
                          </Badge>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col gap-2 items-center min-w-[110px]">
                        {user?.role === 'candidate' && (
                          <>
                            {isLoadingThis ? (
                              <CircularScore score={0} loading={true} />
                            ) : hasScore ? (
                              <CircularScore score={jobScores[job.id]} loading={false} />
                            ) : (
                              <UnanalysedRing />
                            )}
                            <Button
                              variant="secondary"
                              disabled={isLoadingThis}
                              onClick={() => analyseSingleJobScore(job.id)}
                              className="w-full mt-1 text-xs"
                            >
                              {isLoadingThis ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  Analysing...
                                </>
                              ) : hasScore ? (
                                'Re-analyse'
                              ) : (
                                'Analyse Score'
                              )}
                            </Button>
                          </>
                        )}
                        {user?.role !== 'admin' && (
                          <>
                            <Button onClick={() => handleApplyNow(job)} className="w-full">
                              Apply Now
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleViewJobDetails(job)}
                              className="w-full"
                            >
                              View Details
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="w-full md:w-auto min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading more...
                    </>
                  ) : (
                    'Load More Jobs'
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Application Modal */}
      {selectedJob && user?.role !== 'admin' && (
        <JobApplicationModal
          job={selectedJob}
          isOpen={isApplicationModalOpen}
          onClose={() => {
            setIsApplicationModalOpen(false);
            setSelectedJob(null);
          }}
        />
      )}

      {/* Job Details Modal */}
      <JobDetailsModal
        job={viewJob}
        isOpen={isJobModalOpen}
        onClose={() => {
          setIsJobModalOpen(false);
          setViewJob(null);
        }}
      />

      {/* ── AI Analysis Modal ──────────────────────────────────────────────── */}
      {/* ✅ FIX 4: Added DialogTitle (fixes radix-ui accessibility warning) */}
      <Dialog open={isAnalysisModalOpen} onOpenChange={setIsAnalysisModalOpen}>
        <DialogContent className="max-w-lg bg-white border-none shadow-2xl overflow-hidden p-0">
          <VisuallyHidden>
            <DialogTitle>AI Career Insight for {selectedAnalysis?.jobTitle}</DialogTitle>
          </VisuallyHidden>

          {/* Gradient header with score ring */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 text-white relative">
            <Sparkles className="absolute top-4 right-4 h-8 w-8 opacity-20 animate-pulse" />
            <div className="relative z-10 text-center">
              <h2 className="text-2xl font-bold mb-1">AI Career Insight</h2>
              <p className="text-indigo-100 opacity-90 text-sm">{selectedAnalysis?.jobTitle}</p>

              <div className="mt-6 flex flex-col items-center">
                <div className="relative w-24 h-24 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="44" fill="rgba(255,255,255,0.1)" />
                    <circle
                      cx="48" cy="48" r="44"
                      fill="none"
                      stroke="white"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 44}
                      strokeDashoffset={
                        2 * Math.PI * 44 * (1 - (selectedAnalysis?.score || 0) / 100)
                      }
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute text-2xl font-black">{selectedAnalysis?.score ?? 0}%</span>
                </div>
                <p className="mt-3 text-[10px] tracking-widest uppercase font-bold text-indigo-100">
                  Overall Match Quality
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable body */}
          <div className="max-h-[60vh] overflow-y-auto p-6 space-y-6">

            {/* Research Report / Summary */}
            <div className="bg-indigo-50/80 border-2 border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Search className="h-12 w-12 text-indigo-900" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 italic">
                    Digital Research Report
                  </h4>
                </div>
                {selectedAnalysis?.isRealAI ? (
                  <Badge className="text-[9px] bg-green-500 text-white border-0 shadow-sm px-2 animate-in fade-in zoom-in duration-300">
                    <CheckCircle className="h-3 w-3 mr-1" /> High Confidence Match
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] bg-indigo-100/50 text-indigo-600 border-indigo-200 animate-pulse">
                    Deep Text Analysis Active
                  </Badge>
                )}
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 pt-1">
                  <FileSearch className="h-6 w-6 text-indigo-600" />
                </div>
                <p className="text-sm text-indigo-950 leading-relaxed font-serif tracking-tight whitespace-pre-wrap">
                  {selectedAnalysis?.summary || "Analysis complete. Review the breakdown sections below for detailed insights."}
                </p>
              </div>
            </div>

            {/* Hidden Strengths & Risk Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <Sparkles className="h-4 w-4" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider">Hidden Strengths</h4>
                </div>
                <ul className="space-y-1">
                  {selectedAnalysis?.hiddenStrengths?.length > 0
                    ? selectedAnalysis.hiddenStrengths.map((s: string, i: number) => (
                      <li key={i} className="text-xs text-amber-900">• {s}</li>
                    ))
                    : <li className="text-xs text-amber-400 italic">No inferences found.</li>}
                </ul>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                <div className="flex items-center gap-2 text-rose-700 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <h4 className="font-bold text-[10px] uppercase tracking-wider">Risk Factors</h4>
                </div>
                <ul className="space-y-1">
                  {selectedAnalysis?.riskFactors?.length > 0
                    ? selectedAnalysis.riskFactors.map((r: string, i: number) => (
                      <li key={i} className="text-xs text-rose-900">• {r}</li>
                    ))
                    : <li className="text-xs text-rose-400 italic">No critical risks noted.</li>}
                </ul>
              </div>
            </div>

            {/* Strengths & Growth Areas */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle className="h-4 w-4" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Your Strengths</h4>
                </div>
                <ul className="space-y-2">
                  {selectedAnalysis?.strengths?.length > 0 ? (
                    selectedAnalysis.strengths.map((s: string, i: number) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-gray-700 bg-green-50/50 p-2 rounded-lg border border-green-100 italic"
                      >
                        <span className="text-green-600 font-bold">•</span> {s}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-400 italic px-2">
                      Complete your profile with skills and experience for detailed strengths analysis.
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-rose-700">
                  <XCircle className="h-4 w-4" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">Growth Areas</h4>
                </div>
                <ul className="space-y-2">
                  {selectedAnalysis?.growthAreas?.length > 0 ? (
                    selectedAnalysis.growthAreas.map((g: string, i: number) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-gray-700 bg-rose-50/50 p-2 rounded-lg border border-rose-100 italic"
                      >
                        <span className="text-rose-600 font-bold">•</span> {g}
                      </li>
                    ))
                  ) : (
                    <li className="text-sm text-gray-400 italic px-2">No significant gaps found.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Domain Breakdown */}
            {selectedAnalysis?.domainBreakdown?.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">
                  Domain Alignment Breakdown
                </h4>
                <div className="space-y-3">
                  {selectedAnalysis.domainBreakdown.map((domain: any, idx: number) => (
                    <div key={idx} className="bg-gray-50/50 rounded-xl p-4 border border-gray-100">
                      <div className="flex justify-between items-center mb-2">
                        <h5 className="font-bold text-sm text-gray-800">{domain.domain}</h5>
                        <Badge variant="outline" className="text-indigo-600 text-[10px]">
                          Scored: {domain.score}%
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {domain.matchedSkills?.map((ms: string, mi: number) => (
                          <Badge key={mi} variant="secondary" className="bg-green-100 text-green-700 text-[9px]">
                            {ms}
                          </Badge>
                        ))}
                        {domain.missingSkills?.map((miss: string, missi: number) => (
                          <Badge key={missi} variant="outline" className="text-gray-400 border-gray-200 text-[9px]">
                            {miss}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4-Layer Breakdown */}
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
                4-Layer AI Decision Logic
              </h4>
              {[
                { label: 'Core Skill Alignment (40%)', color: '#6366f1' },
                { label: 'Experience Depth (25%)', color: '#9333ea' },
                { label: 'Contextual Similarity (20%)', color: '#ec4899' },
                { label: 'Potential & Growth (15%)', color: '#f59e0b' },
              ].map(({ label, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-medium uppercase tracking-wider text-gray-500">
                    <span>{label}</span>
                    <span className="font-bold" style={{ color }}>{selectedAnalysis?.score ?? 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${selectedAnalysis?.score ?? 0}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobListing;