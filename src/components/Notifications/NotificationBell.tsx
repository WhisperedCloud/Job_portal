import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Badge } from '../ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Notification {
  id: string;
  type: string;
  data: any;
  is_read: boolean;
  created_at: string;
}

function getNotificationText(n: Notification): { title: string; message: string } {
  switch (n.type) {
    case 'job_alert':
      return {
        title: `New Job: ${n.data?.job_title || 'Opportunity'}`,
        message: `${n.data?.company || ''} · ${n.data?.location || ''}`,
      };
    case 'application_update':
      return {
        title: `Application Update`,
        message: n.data?.message || 'Your application status changed.',
      };
    case 'interview_scheduled':
      return {
        title: `Interview Scheduled`,
        message: n.data?.message || 'An interview has been scheduled.',
      };
    case 'application_received':
      return {
        title: `New Application`,
        message: n.data?.message || `${n.data?.candidate_name} applied for ${n.data?.job_title}`,
      };
    default:
      return {
        title: n.data?.title || 'Notification',
        message: n.data?.message || '',
      };
  }
}

export const NotificationBell = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userRoleId, setUserRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    // First resolve the user_roles.id for this user
    supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) {
          setUserRoleId(data.id);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!userRoleId) return;
    fetchNotifications(userRoleId);

    // Realtime subscription
    const channel = supabase
      .channel(`notifications_${userRoleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userRoleId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
          const { title } = getNotificationText(newNotif);
          toast.info(title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userRoleId]);

  const fetchNotifications = async (roleId: string) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', roleId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllRead = async () => {
    if (!userRoleId) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userRoleId)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="p-3 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button
              className="text-xs text-blue-600 hover:underline"
              onClick={markAllRead}
            >
              Mark all read
            </button>
          )}
        </div>
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No notifications yet!</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => {
              const { title, message } = getNotificationText(notification);
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start p-3 cursor-pointer border-b last:border-b-0 ${!notification.is_read ? 'bg-blue-50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="font-medium text-sm">{title}</div>
                    {!notification.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />
                    )}
                  </div>
                  {message && (
                    <div className="text-xs text-muted-foreground mt-0.5">{message}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};