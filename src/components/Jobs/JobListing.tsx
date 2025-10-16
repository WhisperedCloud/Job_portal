import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { MapPin, Clock, Building, Search, Briefcase, Loader2, Star } from 'lucide-react';
import JobApplicationModal from '../Applications/JobApplicationModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CircularScore = ({ score, loading = false }: { score: number; loading?: boolean }) => {
  const circumference = 2 * Math.PI * 24;
  const offset = circumference * (1 - score / 100);

  if (loading) {
    return (
      <div className="relative flex items-center justify-center w-14 h-14">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const getColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#6366f1';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative flex items-center justify-center w-14 h-14">
      <svg width="56" height="56" className="transform -rotate-90">
        <circle cx="28" cy="28" r="24" fill="#f3f4f6" />
        <circle
          cx="28"
          cy="28"
          r="24"
          fill="none"
          stroke={getColor(score)}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.3s ease'
          }}
        />
      </svg>
      <span className="absolute text-sm font-bold" style={{ color: getColor(score) }}>
        {score}%
      </span>
    </div>
  );
};

const JobDetailsModal = ({ job, isOpen, onClose }) => {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const DESCRIPTION_LIMIT = 400;

  if (!isOpen || !job) return null;

  const isLongDescription = job.job_description && job.job_description.length > DESCRIPTION_LIMIT;

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
              {isLongDescription && !showFullDescription
                ? job.job_description.slice(0, DESCRIPTION_LIMIT) + '...'
                : job.job_description || 'N/A'}
            </p>
            {isLongDescription && (
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
                ? job.skills_required.map((skill, idx) => (
                  <Badge key={idx} variant="secondary">{skill}</Badge>
                ))
                : <span className="text-muted-foreground">None listed</span>
              }
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

const JobListing = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobScores, setJobScores] = useState<{ [jobId: string]: number }>({});
  const [loadingScores, setLoadingScores] = useState<{ [jobId: string]: boolean }>({});
  const [viewJob, setViewJob] = useState(null);
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
    loadScoresFromLocalStorage();
  }, []);

  const loadScoresFromLocalStorage = () => {
    try {
      const storedScores = localStorage.getItem('jobMatchScores');
      if (storedScores) {
        setJobScores(JSON.parse(storedScores));
      }
    } catch (error) {
      console.error('Failed to load scores from local storage:', error);
    }
  };

  const saveScoresToLocalStorage = (newScores) => {
    try {
      localStorage.setItem('jobMatchScores', JSON.stringify(newScores));
    } catch (error) {
      console.error('Failed to save scores to local storage:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          recruiter:recruiters (
            id,
            company_name,
            industry
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const analyseSingleJobScore = async (jobId: string) => {
    if (!user?.candidate_id) {
      toast.error("You must be a candidate to analyse.");
      return;
    }

    setLoadingScores(prev => ({ ...prev, [jobId]: true }));

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;
      if (!token) {
        throw new Error("No auth session found");
      }

      const response = await fetch(
        'https://yzppfbsoarvaodfncpjh.functions.supabase.co/job-match-score',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ candidateId: user.candidate_id, jobId })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to fetch job match score: ${errorText}`);
      }

      const data = await response.json();
      const newScores = {
        ...jobScores,
        [data.jobId]: typeof data.score === 'number' ? data.score : 0
      };

      setJobScores(newScores);
      saveScoresToLocalStorage(newScores);

      toast.success('Job match score calculated!');
    } catch (error) {
      console.error('Error fetching job match score:', error);
      toast.error('Failed to calculate job match score');
    } finally {
      setLoadingScores(prev => ({ ...prev, [jobId]: false }));
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skills_required?.some((skill: string) => skill.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesLocation = !locationFilter || job.location?.toLowerCase().includes(locationFilter.toLowerCase());
    const matchesExperience = !experienceFilter || experienceFilter === 'all' || job.experience_level === experienceFilter;
    return matchesSearch && matchesLocation && matchesExperience;
  });

  const handleApplyNow = (job) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleViewJobDetails = (job) => {
    setViewJob(job);
    setIsJobModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Browse Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Find your next opportunity
        </p>
        {user?.candidate_id && (
          <div className="mt-4">
            <span className="text-sm text-muted-foreground">
              Analyse a job score by clicking its button below.
            </span>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter Jobs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Input
                placeholder="Search by job title or skills"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Input
                placeholder="Location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>
            <div>
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
            </div>
            <div>
              <Button className="w-full" onClick={fetchJobs}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {filteredJobs.length} jobs found
        </div>
        {filteredJobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                No jobs found. {jobs.length === 0 ? 'No jobs have been posted yet.' : 'Try adjusting your filters.'}
              </p>
              <Button onClick={fetchJobs} variant="outline">
                Refresh Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job) => {
            const hasScore = jobScores[job.id] !== undefined;
            return (
              <Card
                key={job.id}
                className={`hover:shadow-md transition-shadow ${hasScore ? 'border-primary border-2 shadow-lg' : ''}`}
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
                          {job.skills_required.map((skill, index) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {job.experience_level && (
                        <Badge variant={job.experience_level === 'fresher' ? 'default' : 'outline'}>
                          {job.experience_level}
                        </Badge>
                      )}
                    </div>
                    <div className="ml-4 flex flex-col gap-2 items-center">
                      {user?.candidate_id && (
                        <>
                          <CircularScore
                            score={jobScores[job.id] ?? 0}
                            loading={loadingScores[job.id]}
                          />
                          <Button
                            variant="secondary"
                            disabled={loadingScores[job.id]}
                            onClick={() => analyseSingleJobScore(job.id)}
                            className="w-full mt-2"
                          >
                            {loadingScores[job.id] ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Analysing...
                              </>
                            ) : (
                              <>Analyse Score</>
                            )}
                          </Button>
                        </>
                      )}
                      {user?.role !== 'admin' && (
                        <>
                          <Button onClick={() => handleApplyNow(job)} className="w-full">Apply Now</Button>
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
          })
        )}
      </div>

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

      <JobDetailsModal
        job={viewJob}
        isOpen={isJobModalOpen}
        onClose={() => {
          setIsJobModalOpen(false);
          setViewJob(null);
        }}
      />
    </div>
  );
};

export default JobListing;