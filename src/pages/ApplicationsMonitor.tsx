import React, { useState, useEffect } from 'react';
// Ensure the correct path to the card module
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
  AlertTriangle
} from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ApplicationStat {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    inReview: number;
}

interface ApplicationSummary {
    id: string;
    candidateName: string;
    jobTitle: string;
    company: string;
    status: string;
    appliedDate: string;
    location: string;
}

// Placeholder for fetching aggregated stats (requires RLS and complex SQL queries, often done via RPC or views)
const fetchApplicationStats = async (): Promise<ApplicationStat> => {
    // In a real application, you would call a PostgreSQL function (RPC) here
    // to get aggregated counts across the entire 'applications' table.
    console.log("Fetching aggregate application statistics...");
    
    // Simulating success after a delay with placeholder data
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    return {
        total: 567,
        pending: 204,
        approved: 105,
        rejected: 89,
        inReview: 168
    };
};

// Placeholder for fetching recent applications (Requires RLS to allow Admins to read all)
const fetchRecentApplications = async (): Promise<ApplicationSummary[]> => {
    // Note: For this to work, the Admin user MUST have a policy on the applications table
    // that allows them to SELECT * (e.g., check against user_roles table for 'admin' role)
    try {
        const { data, error } = await supabase
            .from('applications')
            .select(`
                id, status, applied_at,
                job:jobs (title, recruiter:recruiters (company_name)),
                candidate:candidates (name, location)
            `)
            .order('applied_at', { ascending: false })
            .limit(10); // Fetch top 10 recent applications

        if (error) throw error;
        
        return data.map(app => ({
            id: app.id,
            candidateName: app.candidate?.name || 'N/A',
            jobTitle: app.job?.title || 'N/A',
            company: app.job?.recruiter?.company_name || 'N/A',
            status: app.status,
            appliedDate: app.applied_at,
            location: app.candidate?.location || 'N/A'
        })) as ApplicationSummary[];

    } catch (error) {
        console.error("Failed to fetch recent applications:", error);
        toast.error("Failed to fetch recent application data.");
        return [];
    }
};


const ApplicationsMonitor = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('7days');
  const [stats, setStats] = useState<ApplicationStat | null>(null);
  const [recentApps, setRecentApps] = useState<ApplicationSummary[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setDataLoading(true);
      const [statsResult, appsResult] = await Promise.all([
        fetchApplicationStats(),
        fetchRecentApplications(),
      ]);
      setStats(statsResult);
      setRecentApps(appsResult);
      setDataLoading(false);
    };
    loadData();
  }, []); // Run only on mount

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 'hired':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied':
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
      case 'hired':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'in_review':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };
  
  const filteredRecentApps = recentApps.filter(app => {
    const statusMatch = statusFilter === 'all' || app.status === statusFilter;
    const searchMatch = app.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        app.jobTitle.toLowerCase().includes(searchTerm.toLowerCase());
    return statusMatch && searchMatch;
  });
  
  if (dataLoading) {
    return <div>Loading monitor data...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground">Applications Monitor</h1>
                <p className="text-muted-foreground mt-2">
                  Real-time monitoring and analytics for job applications
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                <Button>
                  <Filter className="h-4 w-4 mr-2" />
                  Advanced Filters
                </Button>
              </div>
            </div>

            {/* Stats Overview */}
            {stats && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Applications</p>
                      <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-500">+12%</span>
                      </div>
                    </div>
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending/Applied</p>
                      <p className="text-2xl font-bold">{stats.pending.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="text-sm text-yellow-500">+5%</span>
                      </div>
                    </div>
                    <Clock className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Approved/Hired</p>
                      <p className="text-2xl font-bold">{stats.approved.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                        <span className="text-sm text-green-500">+8%</span>
                      </div>
                    </div>
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">In Review</p>
                      <p className="text-2xl font-bold">{stats.inReview.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <AlertTriangle className="h-4 w-4 text-blue-500 mr-1" />
                        <span className="text-sm text-blue-500">-2%</span>
                      </div>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Rejected</p>
                      <p className="text-2xl font-bold">{stats.rejected.toLocaleString()}</p>
                      <div className="flex items-center mt-2">
                        <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                        <span className="text-sm text-red-500">-3%</span>
                      </div>
                    </div>
                    <XCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
            )}

            {/* Monitoring Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="recent">Recent Activity</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="alerts">Alerts</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
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
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="applied">Applied</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="hired">Hired</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="Time range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24hours">Last 24 Hours</SelectItem>
                          <SelectItem value="7days">Last 7 Days</SelectItem>
                          <SelectItem value="30days">Last 30 Days</SelectItem>
                          <SelectItem value="90days">Last 90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Applications List */}
                <Card>
                  <CardHeader>
                    <CardTitle>Application Status Overview ({filteredRecentApps.length})</CardTitle>
                    <CardDescription>
                      Monitor recent job applications and their current status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {filteredRecentApps.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No recent applications match your filters.</p>
                        </div>
                      ) : (
                        filteredRecentApps.map((application) => (
                        <div
                          key={application.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(application.status)}
                            </div>
                            <div>
                              <h3 className="font-medium">{application.candidateName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {application.jobTitle} at {application.company}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {application.location} • Applied {new Date(application.appliedDate).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge className={getStatusColor(application.status)}>
                              {application.status.replace('_', ' ')}
                            </Badge>
                            <Button variant="outline" size="sm">
                              View Details
                            </Button>
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Application Activity</CardTitle>
                    <CardDescription>
                      Latest application submissions and status changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center py-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Recent activity monitoring will be displayed here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Application Analytics</CardTitle>
                    <CardDescription>
                      Detailed analytics and trends for application data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Analytics charts and graphs will be displayed here</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="alerts" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>System Alerts</CardTitle>
                    <CardDescription>
                      Important notifications and system alerts
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>System alerts and notifications will be displayed here</p>
                    </div>
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
