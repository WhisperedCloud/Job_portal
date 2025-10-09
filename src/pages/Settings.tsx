import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  Settings as SettingsIcon, 
  Mail, 
  Bell, 
  Shield, 
  Globe,
  Save,
  Loader2,
  CheckCircle
} from 'lucide-react';
import Navbar from '../components/Layout/Navbar';
import Sidebar from '../components/Layout/Sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  category: string;
  updated_at: string | null;
}

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: '',
    siteDescription: '',
    siteUrl: '',
    contactEmail: '',
    supportEmail: '',
    adminEmail: '',
    allowRegistrations: true,
    requireEmailVerification: false,
  });

  // Email Settings
  const [emailSettings, setEmailSettings] = useState({
    smtpHost: '',
    smtpPort: '',
    smtpUsername: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    newUserRegistration: true,
    newJobPosting: true,
    newApplication: true,
    applicationStatusUpdate: true,
    systemAlerts: true,
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordMinLength: '8',
    maxLoginAttempts: '5',
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) throw error;

      // Convert array to object for easier access
      const settingsObj: Record<string, any> = {};
      (data || []).forEach((setting: PlatformSetting) => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });

      setSettings(settingsObj);

      // Set state for each category
      setGeneralSettings({
        siteName: settingsObj.site_name || '',
        siteDescription: settingsObj.site_description || '',
        siteUrl: settingsObj.site_url || '',
        contactEmail: settingsObj.contact_email || '',
        supportEmail: settingsObj.support_email || '',
        adminEmail: settingsObj.admin_email || '',
        allowRegistrations: settingsObj.allow_registrations ?? true,
        requireEmailVerification: settingsObj.require_email_verification ?? false,
      });

      setEmailSettings({
        smtpHost: settingsObj.smtp_host || '',
        smtpPort: settingsObj.smtp_port || '',
        smtpUsername: settingsObj.smtp_username || '',
        smtpPassword: settingsObj.smtp_password || '',
        fromEmail: settingsObj.smtp_from_email || '',
        fromName: settingsObj.smtp_from_name || '',
      });

      setNotificationSettings({
        newUserRegistration: settingsObj.new_user_registration ?? true,
        newJobPosting: settingsObj.new_job_posting ?? true,
        newApplication: settingsObj.new_application ?? true,
        applicationStatusUpdate: settingsObj.application_status_update ?? true,
        systemAlerts: settingsObj.system_alerts ?? true,
      });

      setSecuritySettings({
        twoFactorAuth: settingsObj.two_factor_auth ?? false,
        sessionTimeout: settingsObj.session_timeout || '30',
        passwordMinLength: settingsObj.password_min_length || '8',
        maxLoginAttempts: settingsObj.max_login_attempts || '5',
      });

    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any, category: string) => {
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          setting_value: value,
          updated_by: user?.id,
        })
        .eq('setting_key', key);

      if (error) throw error;
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      throw error;
    }
  };

  const saveGeneralSettings = async () => {
    try {
      setSaving(true);

      await Promise.all([
        updateSetting('site_name', generalSettings.siteName, 'general'),
        updateSetting('site_description', generalSettings.siteDescription, 'general'),
        updateSetting('site_url', generalSettings.siteUrl, 'general'),
        updateSetting('contact_email', generalSettings.contactEmail, 'general'),
        updateSetting('support_email', generalSettings.supportEmail, 'general'),
        updateSetting('admin_email', generalSettings.adminEmail, 'general'),
        updateSetting('allow_registrations', generalSettings.allowRegistrations, 'general'),
        updateSetting('require_email_verification', generalSettings.requireEmailVerification, 'general'),
      ]);

      toast.success('General settings saved successfully');
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast.error('Failed to save general settings');
    } finally {
      setSaving(false);
    }
  };

  const saveEmailSettings = async () => {
    try {
      setSaving(true);

      await Promise.all([
        updateSetting('smtp_host', emailSettings.smtpHost, 'email'),
        updateSetting('smtp_port', emailSettings.smtpPort, 'email'),
        updateSetting('smtp_username', emailSettings.smtpUsername, 'email'),
        updateSetting('smtp_password', emailSettings.smtpPassword, 'email'),
        updateSetting('smtp_from_email', emailSettings.fromEmail, 'email'),
        updateSetting('smtp_from_name', emailSettings.fromName, 'email'),
      ]);

      toast.success('Email settings saved successfully');
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast.error('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const saveNotificationSettings = async () => {
    try {
      setSaving(true);

      await Promise.all([
        updateSetting('new_user_registration', notificationSettings.newUserRegistration, 'notifications'),
        updateSetting('new_job_posting', notificationSettings.newJobPosting, 'notifications'),
        updateSetting('new_application', notificationSettings.newApplication, 'notifications'),
        updateSetting('application_status_update', notificationSettings.applicationStatusUpdate, 'notifications'),
        updateSetting('system_alerts', notificationSettings.systemAlerts, 'notifications'),
      ]);

      toast.success('Notification settings saved successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const saveSecuritySettings = async () => {
    try {
      setSaving(true);

      await Promise.all([
        updateSetting('two_factor_auth', securitySettings.twoFactorAuth, 'security'),
        updateSetting('session_timeout', securitySettings.sessionTimeout, 'security'),
        updateSetting('password_min_length', securitySettings.passwordMinLength, 'security'),
        updateSetting('max_login_attempts', securitySettings.maxLoginAttempts, 'security'),
      ]);

      toast.success('Security settings saved successfully');
    } catch (error) {
      console.error('Error saving security settings:', error);
      toast.error('Failed to save security settings');
    } finally {
      setSaving(false);
    }
  };

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
            <div>
              <h1 className="text-3xl font-bold text-foreground">Platform Settings</h1>
              <p className="text-muted-foreground mt-2">
                Configure and manage platform-wide settings
              </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">
                  <Globe className="h-4 w-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="notifications">
                  <Bell className="h-4 w-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security">
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </TabsTrigger>
              </TabsList>

              {/* General Settings */}
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Configure basic platform information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="siteName">Site Name</Label>
                        <Input
                          id="siteName"
                          value={generalSettings.siteName}
                          onChange={(e) => setGeneralSettings({...generalSettings, siteName: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="siteUrl">Site URL</Label>
                        <Input
                          id="siteUrl"
                          value={generalSettings.siteUrl}
                          onChange={(e) => setGeneralSettings({...generalSettings, siteUrl: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="siteDescription">Site Description</Label>
                      <Input
                        id="siteDescription"
                        value={generalSettings.siteDescription}
                        onChange={(e) => setGeneralSettings({...generalSettings, siteDescription: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="contactEmail">Contact Email</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={generalSettings.contactEmail}
                          onChange={(e) => setGeneralSettings({...generalSettings, contactEmail: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="supportEmail">Support Email</Label>
                        <Input
                          id="supportEmail"
                          type="email"
                          value={generalSettings.supportEmail}
                          onChange={(e) => setGeneralSettings({...generalSettings, supportEmail: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="adminEmail">Admin Email</Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          value={generalSettings.adminEmail}
                          onChange={(e) => setGeneralSettings({...generalSettings, adminEmail: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Allow User Registrations</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable new users to register on the platform
                          </p>
                        </div>
                        <Switch
                          checked={generalSettings.allowRegistrations}
                          onCheckedChange={(checked) => setGeneralSettings({...generalSettings, allowRegistrations: checked})}
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
                          checked={generalSettings.requireEmailVerification}
                          onCheckedChange={(checked) => setGeneralSettings({...generalSettings, requireEmailVerification: checked})}
                        />
                      </div>
                    </div>

                    <Button onClick={saveGeneralSettings} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save General Settings
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Email Settings */}
              <TabsContent value="email" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Email Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure SMTP settings for sending emails
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          value={emailSettings.smtpHost}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                          placeholder="smtp.gmail.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          value={emailSettings.smtpPort}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpPort: e.target.value})}
                          placeholder="587"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="smtpUsername">SMTP Username</Label>
                        <Input
                          id="smtpUsername"
                          value={emailSettings.smtpUsername}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpUsername: e.target.value})}
                        />
                      </div>
                      <div>
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
                      <div>
                        <Label htmlFor="fromEmail">From Email</Label>
                        <Input
                          id="fromEmail"
                          type="email"
                          value={emailSettings.fromEmail}
                          onChange={(e) => setEmailSettings({...emailSettings, fromEmail: e.target.value})}
                          placeholder="noreply@jobportal.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="fromName">From Name</Label>
                        <Input
                          id="fromName"
                          value={emailSettings.fromName}
                          onChange={(e) => setEmailSettings({...emailSettings, fromName: e.target.value})}
                          placeholder="JobPortal"
                        />
                      </div>
                    </div>

                    <Button onClick={saveEmailSettings} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Email Settings
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notification Settings */}
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

                    <Button onClick={saveNotificationSettings} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Notification Settings
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Settings */}
              <TabsContent value="security" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Configure security and authentication settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Two-Factor Authentication</Label>
                        <p className="text-sm text-muted-foreground">
                          Require 2FA for all admin accounts
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings.twoFactorAuth}
                        onCheckedChange={(checked) => setSecuritySettings({...securitySettings, twoFactorAuth: checked})}
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4">
                      <div>
                        <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                        <Input
                          id="sessionTimeout"
                          type="number"
                          value={securitySettings.sessionTimeout}
                          onChange={(e) => setSecuritySettings({...securitySettings, sessionTimeout: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="passwordMinLength">Min Password Length</Label>
                        <Input
                          id="passwordMinLength"
                          type="number"
                          value={securitySettings.passwordMinLength}
                          onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                        <Input
                          id="maxLoginAttempts"
                          type="number"
                          value={securitySettings.maxLoginAttempts}
                          onChange={(e) => setSecuritySettings({...securitySettings, maxLoginAttempts: e.target.value})}
                        />
                      </div>
                    </div>

                    <Button onClick={saveSecuritySettings} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Security Settings
                        </>
                      )}
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