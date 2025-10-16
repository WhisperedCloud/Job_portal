import { useEffect, useState } from 'react';
import { supabase } from "../integrations/supabase/client";

export default function Notifications({ userId }) {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    async function fetchNotifications() {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setNotifications(data || []);
    }
    if (userId) fetchNotifications();
  }, [userId]);

  // Mark notification as read
  const markAsRead = async (id) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  return (
    <div>
      <h3>Notifications</h3>
      <ul>
        {notifications.map(n => (
          <li key={n.id} style={{ fontWeight: n.is_read ? 'normal' : 'bold' }}>
            {n.type === 'job_alert' && (
              <div>
                <strong>New Job:</strong> {n.data.job_title} at {n.data.company} ({n.data.location})
              </div>
            )}
            <button disabled={n.is_read} onClick={() => markAsRead(n.id)}>
              {n.is_read ? 'Read' : 'Mark as read'}
            </button>
          </li>
        ))}
        {notifications.length === 0 && <li>No notifications yet.</li>}
      </ul>
    </div>
  );
}