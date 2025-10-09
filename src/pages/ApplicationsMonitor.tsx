import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Search,
  Filter,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApplicationStat {
  total: number;
  applied: number;
  underReview: number;
  interviewed: number;
  hired: number;
  rejected: number;
}

interface RecentApplication {
  id: string;
  candidateName: string;
  jobTitle: string;
  company: string;
  status: string;
  appliedDate: string;
  location: string;
}

interface TrendData {
  date: string;
  applications: number;
}

const ApplicationsMonitor = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState<ApplicationStat>({
    total: 0,
    applied: 0,
    underReview: 0,
    interviewed: 0,
    hired: 0,
    rejected: 0
  });
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplicationStats();
    fetchRecentApplications();
    fetchTrendData();
  }, []);

  const fetchApplicationStats = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('status');

      if (error) throw error;

      const stats = {
        total: data?.length || 0,
        applied: data?.filter(a => a.status === 'applied').length || 0,
        underReview: data?.filter(a => a.status === 'under_review').length || 0,
        interviewed: data?.filter(a => a.status === 'interview_scheduled').length || 0,
        hired: data?.filter(a => a.status === 'hired').length || 0,
        rejected: data?.filter(a => a.status === 'rejected').length || 0
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('Failed to load application statistics');
    }
  };

  const fetchRecentApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          jobs (
            title,
            recruiters (
              company_name
            )
          ),
          candidates (
            name,
            location
          )
        `)
        .order('applied_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      const formattedApplications: RecentApplication[] = (data || []).map((app: any) => ({
        id: app.id,
        candidateName: app.candidates?.name || 'Unknown',
        jobTitle: app.jobs?.title || 'N/A',
        company: app.jobs?.recruiters?.company_name || 'N/A',
        status: app.status,
        appliedDate: new Date(app.applied_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }),
        location: app.candidates?.location || 'N/A'
      }));

      setRecentApplications(formattedApplications);
    } catch (error) {
      console.error('Error fetching recent applications:', error);
      toast.error('Failed to load recent applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('applied_at')
        .gte('applied_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('applied_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc: any, app: any) => {
        const date = new Date(app.applied_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const trendData = Object.entries(grouped).map(([date, count]) => ({
        date,
        applications: count as number
      }));

      setTrendData(trendData);
    } catch (error) {
      console.error('Error fetching trend data:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 text-blue-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview_scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
        return <Clock className="h-4 w-4" />;
      case 'under_review':
        return <AlertTriangle className="h-4 w-4" />;
      case 'hired':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Candidate', 'Job Title', 'Company', 'Status', 'Applied Date', 'Location'],
      ...recentApplications.map(app => [
        app.candidateName,
        app.jobTitle,
        app.company,
        app.status,
        app.appliedDate,
        app.location
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('Report exported successfully');
  };

  const filteredApplications = recentApplications.filter(app => {
    const matchesSearch = app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Applications Monitor</h1>
                <p className="text-muted-foreground mt-2">
                  Real-time analytics and monitoring of all applications
                </p>
              </div>
              <Button onClick={exportData}>
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Applied</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.applied}</p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">In Review</p>
                      <p className="text-2xl font-bold text-yellow-600">{stats.underReview}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Interviewed</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.interviewed}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Hired</p>
                      <p className="text-2xl font-bold text-green-600">{stats.hired}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex gap-4 items-center">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search applications..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="interview_scheduled">Interviewed</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="recent" className="space-y-4">
              <TabsList>
                <TabsTrigger value="recent">Recent Applications</TabsTrigger>
                <TabsTrigger value="trends">Trends</TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Applications</CardTitle>
                    <CardDescription>
                      Latest applications submitted to the platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredApplications.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No applications found</p>
                      ) : (
                        filteredApplications.map((app) => (
                          <div
                            key={app.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{app.candidateName}</p>
                                <span className="text-sm text-muted-foreground">applied for</span>
                                <p className="font-medium">{app.jobTitle}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {app.company} • {app.location} • {app.appliedDate}
                              </p>
                            </div>
                            <Badge className={getStatusColor(app.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(app.status)}
                                <span>{app.status.replace('_', ' ').toUpperCase()}</span>
                              </div>
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="trends" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Application Trends (Last 30 Days)</CardTitle>
                    <CardDescription>
                      Daily application submission trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendData.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No trend data available</p>
                    ) : (
                      <div className="space-y-2">
                        {trendData.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-24 text-sm text-muted-foreground">{item.date}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-8 bg-blue-500 rounded"
                                  style={{ width: `${(item.applications / Math.max(...trendData.map(d => d.applications))) * 100}%` }}
                                />
                                <span className="text-sm font-medium">{item.applications}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ApplicationsMonitor;