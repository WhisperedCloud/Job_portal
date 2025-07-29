
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Save, Server, Shield, Bell, Mail, Database } from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';

const Settings = () => {
  const [platformSettings, setPlatformSettings] = useState({
    siteName: 'JobPortal Pro',
    siteDescription: 'Professional job portal for connecting talent with opportunities',
    allowRegistration: true,
    requireEmailVerification: true,
    maxApplicationsPerJob: 100,
    defaultJobExpiryDays: 30,
    maintenanceMode: false
  });

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.example.com',
    smtpPort: '587',
    smtpUsername: 'noreply@jobportal.com',
    smtpPassword: '',
    fromEmail: 'noreply@jobportal.com',
    fromName: 'JobPortal Pro'
  });

  const [notificationSettings, setNotificationSettings] = useState({
    newUserRegistration: true,
    newJobPosting: true,
    newApplication: true,
    applicationStatusUpdate: true,
    systemAlerts: true
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure and manage platform-wide settings
              </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Basic platform configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="siteName">Site Name</Label>
                        <Input
                          id="siteName"
                          value={platformSettings.siteName}
                          onChange={(e) => setPlatformSettings({...platformSettings, siteName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxApplications">Max Applications per Job</Label>
                        <Input
                          id="maxApplications"
                          type="number"
                          value={platformSettings.maxApplicationsPerJob}
                          onChange={(e) => setPlatformSettings({...platformSettings, maxApplicationsPerJob: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="siteDescription">Site Description</Label>
                      <Textarea
                        id="siteDescription"
                        value={platformSettings.siteDescription}
                        onChange={(e) => setPlatformSettings({...platformSettings, siteDescription: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="jobExpiry">Default Job Expiry (Days)</Label>
                        <Input
                          id="jobExpiry"
                          type="number"
                          value={platformSettings.defaultJobExpiryDays}
                          onChange={(e) => setPlatformSettings({...platformSettings, defaultJobExpiryDays: parseInt(e.target.value)})}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow New Registrations</Label>
                          <p className="text-sm text-muted-foreground">
                            Allow new users to register on the platform
                          </p>
                        </div>
                        <Switch
                          checked={platformSettings.allowRegistration}
                          onCheckedChange={(checked) => setPlatformSettings({...platformSettings, allowRegistration: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Require Email Verification</Label>
                          <p className="text-sm text-muted-foreground">
                            Users must verify their email before accessing the platform
                          </p>
                        </div>
                        <Switch
                          checked={platformSettings.requireEmailVerification}
                          onCheckedChange={(checked) => setPlatformSettings({...platformSettings, requireEmailVerification: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            Temporarily disable access to the platform
                          </p>
                        </div>
                        <Switch
                          checked={platformSettings.maintenanceMode}
                          onCheckedChange={(checked) => setPlatformSettings({...platformSettings, maintenanceMode: checked})}
                        />
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save General Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="email" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure SMTP settings for outgoing emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          value={emailSettings.smtpHost}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          value={emailSettings.smtpPort}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpPort: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtpUsername">SMTP Username</Label>
                        <Input
                          id="smtpUsername"
                          value={emailSettings.smtpUsername}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpUsername: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtpPassword">SMTP Password</Label>
                        <Input
                          id="smtpPassword"
                          type="password"
                          value={emailSettings.smtpPassword}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpPassword: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fromEmail">From Email</Label>
                        <Input
                          id="fromEmail"
                          type="email"
                          value={emailSettings.fromEmail}
                          onChange={(e) => setEmailSettings({...emailSettings, fromEmail: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fromName">From Name</Label>
                        <Input
                          id="fromName"
                          value={emailSettings.fromName}
                          onChange={(e) => setEmailSettings({...emailSettings, fromName: e.target.value})}
                        />
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Email Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Settings
                    </CardTitle>
                    <CardDescription>
                      Configure which events trigger notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>New User Registration</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify admins when new users register
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.newUserRegistration}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newUserRegistration: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>New Job Posting</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify admins when new jobs are posted
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.newJobPosting}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newJobPosting: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>New Application</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify recruiters when candidates apply
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.newApplication}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, newApplication: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Application Status Updates</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify candidates when application status changes
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.applicationStatusUpdate}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, applicationStatusUpdate: checked})}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>System Alerts</Label>
                          <p className="text-sm text-muted-foreground">
                            Notify admins of system issues and alerts
                          </p>
                        </div>
                        <Switch
                          checked={notificationSettings.systemAlerts}
                          onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, systemAlerts: checked})}
                        />
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Notification Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Configure platform security and access controls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input
                          id="sessionTimeout"
                          type="number"
                          defaultValue="30"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="passwordMinLength">Minimum Password Length</Label>
                        <Input
                          id="passwordMinLength"
                          type="number"
                          defaultValue="8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="allowedDomains">Allowed Email Domains (one per line)</Label>
                      <Textarea
                        id="allowedDomains"
                        placeholder="example.com&#10;company.org"
                        rows={4}
                      />
                      <p className="text-sm text-muted-foreground">
                        Leave empty to allow all domains
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Two-Factor Authentication</Label>
                          <p className="text-sm text-muted-foreground">
                            Require 2FA for admin accounts
                          </p>
                        </div>
                        <Switch defaultChecked={false} />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Rate Limiting</Label>
                          <p className="text-sm text-muted-foreground">
                            Protect against spam and abuse
                          </p>
                        </div>
                        <Switch defaultChecked={true} />
                      </div>
                    </div>

                    <Button>
                      <Save className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </Button>
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

export default Settings;
